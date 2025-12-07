1// Globals enabled in vitest.config.ts - describe, it, expect, beforeEach, vi are available globally
import { vi } from 'vitest';
import { GooglePlacesService } from '../../../src/services/googlePlaces';
import * as obsidian from 'obsidian';
import {
	MOCK_SEARCH_RESPONSE,
	MOCK_EMPTY_SEARCH_RESPONSE,
	MOCK_PLACE_DETAILS_FULL,
	MOCK_API_ERROR_403,
	MOCK_API_ERROR_429,
	MOCK_API_ERROR_500
} from '../../fixtures/googlePlacesResponses';

// Spy on the obsidian module
const mockRequestUrl = vi.spyOn(obsidian, 'requestUrl' as any);
const mockNotice = vi.spyOn(obsidian, 'Notice' as any);

describe('GooglePlacesService', () => {
	let service: GooglePlacesService;
	const TEST_API_KEY = 'test-api-key-12345';

	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();
		service = new GooglePlacesService(TEST_API_KEY);
	});

	describe('searchPlaces', () => {
		it('should return array of PlaceSearchResult for valid query', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: MOCK_SEARCH_RESPONSE
			} as any);

			const results = await service.searchPlaces('Pizza Hut Los Angeles');

			expect(results).toHaveLength(2);
			expect(results[0]).toEqual({
				id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
				displayName: 'Pizza Hut',
				formattedAddress: '123 Main St, Los Angeles, CA 90001'
			});

			// Verify the API was called correctly
			expect(mockRequestUrl).toHaveBeenCalledWith({
				url: 'https://places.googleapis.com/v1/places:searchText',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': TEST_API_KEY,
					'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
				},
				body: JSON.stringify({ textQuery: 'Pizza Hut Los Angeles' })
			});
		});

		it('should return empty array when no results found', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: MOCK_EMPTY_SEARCH_RESPONSE
			} as any);

			const results = await service.searchPlaces('NonexistentPlace12345');

			expect(results).toEqual([]);
			expect(mockNotice).toHaveBeenCalledWith('No results found for your search');
		});

		it('should throw error with Notice when API key is invalid (403)', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 403,
				json: MOCK_API_ERROR_403
			} as any);

			await expect(service.searchPlaces('Pizza')).rejects.toThrow('Invalid API key');
			expect(mockNotice).toHaveBeenCalledWith('Invalid API key. Please check your settings.');
		});

		it('should throw error with Notice when rate limited (429)', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 429,
				json: MOCK_API_ERROR_429
			} as any);

			await expect(service.searchPlaces('Pizza')).rejects.toThrow('Rate limit exceeded');
			expect(mockNotice).toHaveBeenCalledWith('Rate limit exceeded. Please try again later.');
		});

		it('should throw error with Notice on 500 response', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 500,
				json: MOCK_API_ERROR_500
			} as any);

			await expect(service.searchPlaces('Pizza')).rejects.toThrow('API request failed: 500');
		});

		it('should throw error with Notice on network failure', async () => {
			mockRequestUrl.mockRejectedValueOnce(new Error('Network connection failed'));

			await expect(service.searchPlaces('Pizza')).rejects.toThrow('Network connection failed');
			expect(mockNotice).toHaveBeenCalledWith('Network error. Please check your connection.');
		});

		it('should throw error when API key is not configured', async () => {
			const serviceWithoutKey = new GooglePlacesService('');

			await expect(serviceWithoutKey.searchPlaces('Pizza')).rejects.toThrow('API key not configured');
			expect(mockNotice).toHaveBeenCalledWith('Configure your Google Places API key in plugin settings');
		});

		it('should properly format API request', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: MOCK_SEARCH_RESPONSE
			} as any);

			await service.searchPlaces('Test Query');

			const callArgs = mockRequestUrl.mock.calls[0][0];
			expect(callArgs.method).toBe('POST');
			expect(callArgs.url).toContain('places:searchText');
			expect(callArgs.headers).toHaveProperty('X-Goog-Api-Key', TEST_API_KEY);
			expect(callArgs.headers).toHaveProperty('X-Goog-FieldMask');
			expect(callArgs.body).toContain('Test Query');
		});

		it('should transform API response to PlaceSearchResult format', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: MOCK_SEARCH_RESPONSE
			} as any);

			const results = await service.searchPlaces('Pizza');

			// Check that the transformation happened correctly
			results.forEach(result => {
				expect(result).toHaveProperty('id');
				expect(result).toHaveProperty('displayName');
				expect(result).toHaveProperty('formattedAddress');
				expect(typeof result.displayName).toBe('string');
			});
		});

		it('should rethrow API-specific errors without showing network error notice', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 403,
				json: MOCK_API_ERROR_403
			} as any);

			await expect(service.searchPlaces('Pizza')).rejects.toThrow('Invalid API key');

			// Should show API-specific notice, not network error notice
			expect(mockNotice).toHaveBeenCalledWith('Invalid API key. Please check your settings.');
			expect(mockNotice).not.toHaveBeenCalledWith('Network error. Please check your connection.');
		});
	});

	describe('getPlaceDetails', () => {
		const TEST_PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

		it('should return PlaceDetails for valid place ID', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: MOCK_PLACE_DETAILS_FULL
			} as any);

			const details = await service.getPlaceDetails(TEST_PLACE_ID);

			expect(details).toEqual(MOCK_PLACE_DETAILS_FULL);
			expect(details.id).toBe(TEST_PLACE_ID);
			expect(details.displayName.text).toBe('Pizza Hut');
		});

		it('should handle missing optional fields', async () => {
			const minimalResponse = {
				id: TEST_PLACE_ID,
				displayName: { text: 'Test Place' },
				formattedAddress: '123 Test St',
				location: { latitude: 0, longitude: 0 },
				types: ['restaurant'],
				rating: 0,
				businessStatus: 'OPERATIONAL'
			};

			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: minimalResponse
			} as any);

			const details = await service.getPlaceDetails(TEST_PLACE_ID);

			expect(details).toEqual(minimalResponse);
			expect(details.photos).toBeUndefined();
			expect(details.internationalPhoneNumber).toBeUndefined();
		});

		it('should throw error with Notice on API errors', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 403,
				json: MOCK_API_ERROR_403
			} as any);

			await expect(service.getPlaceDetails(TEST_PLACE_ID)).rejects.toThrow('Invalid API key');
			expect(mockNotice).toHaveBeenCalledWith('Invalid API key. Please check your settings.');
		});

		it('should throw error when rate limited', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 429,
				json: MOCK_API_ERROR_429
			} as any);

			await expect(service.getPlaceDetails(TEST_PLACE_ID)).rejects.toThrow('Rate limit exceeded');
			expect(mockNotice).toHaveBeenCalledWith('Rate limit exceeded. Please try again later.');
		});

		it('should properly use field mask in request', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: MOCK_PLACE_DETAILS_FULL
			} as any);

			await service.getPlaceDetails(TEST_PLACE_ID);

			const callArgs = mockRequestUrl.mock.calls[0][0];
			expect(callArgs.headers['X-Goog-FieldMask']).toContain('id');
			expect(callArgs.headers['X-Goog-FieldMask']).toContain('displayName');
			expect(callArgs.headers['X-Goog-FieldMask']).toContain('rating');
			expect(callArgs.headers['X-Goog-FieldMask']).toContain('location');
			expect(callArgs.headers['X-Goog-FieldMask']).toContain('internationalPhoneNumber');
		});

		it('should use GET method with correct URL', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: MOCK_PLACE_DETAILS_FULL
			} as any);

			await service.getPlaceDetails(TEST_PLACE_ID);

			const callArgs = mockRequestUrl.mock.calls[0][0];
			expect(callArgs.method).toBe('GET');
			expect(callArgs.url).toBe(`https://places.googleapis.com/v1/places/${TEST_PLACE_ID}`);
		});

		it('should throw error when API key is not configured', async () => {
			const serviceWithoutKey = new GooglePlacesService('');

			await expect(serviceWithoutKey.getPlaceDetails(TEST_PLACE_ID)).rejects.toThrow('API key not configured');
			expect(mockNotice).toHaveBeenCalledWith('Configure your Google Places API key in plugin settings');
		});

		it('should handle network errors', async () => {
			mockRequestUrl.mockRejectedValueOnce(new Error('Network timeout'));

			await expect(service.getPlaceDetails(TEST_PLACE_ID)).rejects.toThrow('Network timeout');
			expect(mockNotice).toHaveBeenCalledWith('Network error. Please check your connection.');
		});

		it('should include API key in headers', async () => {
			mockRequestUrl.mockResolvedValueOnce({
				status: 200,
				json: MOCK_PLACE_DETAILS_FULL
			} as any);

			await service.getPlaceDetails(TEST_PLACE_ID);

			const callArgs = mockRequestUrl.mock.calls[0][0];
			expect(callArgs.headers['X-Goog-Api-Key']).toBe(TEST_API_KEY);
		});
	});
});
