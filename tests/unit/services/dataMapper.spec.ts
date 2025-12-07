// Globals enabled in vitest.config.ts - describe, it, expect, beforeEach are available globally
import { DataMapper } from '../../../src/services/dataMapper';
import { GooglePlaceDetailsResponse, GooglePlacesPluginSettings, DEFAULT_SETTINGS } from '../../../src/types';
import {
	MOCK_PLACE_DETAILS_FULL,
	MOCK_PLACE_DETAILS_MINIMAL,
	MOCK_PLACE_DETAILS_CLOSED,
	MOCK_PLACE_DETAILS_CHINESE
} from '../../fixtures/googlePlacesResponses';

describe('DataMapper', () => {
	let dataMapper: DataMapper;
	let settings: GooglePlacesPluginSettings;

	beforeEach(() => {
		settings = { ...DEFAULT_SETTINGS };
		dataMapper = new DataMapper(settings);
	});

	describe('mapPlaceDetailsToFrontmatter', () => {
		it('should map all standard fields correctly', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_FULL);

			expect(result).toMatchObject({
				cuisine: expect.arrayContaining(['Italian', 'Pizza', 'Restaurant']),
				city: 'Los Angeles',
				'rating-google': 4.5,
				link: 'https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4',
				address: '123 Main St, Los Angeles, CA 90001',
				phone: '+1 555-0123',
				isClosed: false,
				location: ['34.0522', '-118.2437']
			});
		});

		it('should handle missing optional fields gracefully', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_MINIMAL);

			expect(result).toMatchObject({
				cuisine: ['Restaurant'],
				link: 'https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY6',
				address: '789 Elm St, New York, NY 10001',
				isClosed: false,
				location: ['40.7128', '-74.006']
			});

			// Should not have optional fields
			// Note: rating of 0 is falsy and won't be added by the mapper
			expect(result['rating-google']).toBeUndefined();
			expect(result.city).toBeUndefined();
			expect(result.phone).toBeUndefined();
		});

		it('should format location as array of strings', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_FULL);

			expect(result.location).toEqual(['34.0522', '-118.2437']);
			expect(typeof result.location?.[0]).toBe('string');
			expect(typeof result.location?.[1]).toBe('string');
		});

		it('should prefer international phone number over national', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_FULL);

			expect(result.phone).toBe('+1 555-0123');
		});

		it('should use national phone number when international is missing', () => {
			const placeWithOnlyNational: GooglePlaceDetailsResponse = {
				...MOCK_PLACE_DETAILS_MINIMAL,
				nationalPhoneNumber: '(555) 1234'
			};

			const result = dataMapper.mapPlaceDetailsToFrontmatter(placeWithOnlyNational);

			expect(result.phone).toBe('(555) 1234');
		});

		it('should set isClosed based on businessStatus', () => {
			const openResult = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_FULL);
			expect(openResult.isClosed).toBe(false);

			const closedResult = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_CLOSED);
			expect(closedResult.isClosed).toBe(true);
		});

		it('should generate correct Google Maps link', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_CHINESE);

			expect(result.link).toBe('https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY8');
		});

		it('should not include image field in frontmatter', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_FULL);

			expect(result.image).toBeUndefined();
		});
	});

	describe('extractCuisineTypes', () => {
		it('should extract recognized cuisine types', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_CHINESE);

			expect(result.cuisine).toEqual(expect.arrayContaining(['Chinese', 'Restaurant', 'Food']));
			expect(result.cuisine).toHaveLength(3);
		});

		it('should filter out non-cuisine types', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_FULL);

			// Should include italian_restaurant, pizza_restaurant, restaurant
			// Should NOT include point_of_interest, establishment
			expect(result.cuisine).toEqual(expect.arrayContaining(['Italian', 'Pizza', 'Restaurant']));
			expect(result.cuisine).not.toContain('point_of_interest');
			expect(result.cuisine).not.toContain('establishment');
		});

		it('should return "Restaurant" as default when no cuisine types match', () => {
			const placeWithNoCuisine: GooglePlaceDetailsResponse = {
				...MOCK_PLACE_DETAILS_MINIMAL,
				types: ['point_of_interest', 'establishment']
			};

			const result = dataMapper.mapPlaceDetailsToFrontmatter(placeWithNoCuisine);

			expect(result.cuisine).toEqual(['Restaurant']);
		});

		it('should handle empty types array', () => {
			const placeWithNoTypes: GooglePlaceDetailsResponse = {
				...MOCK_PLACE_DETAILS_MINIMAL,
				types: []
			};

			const result = dataMapper.mapPlaceDetailsToFrontmatter(placeWithNoTypes);

			// Note: empty types array means the cuisine field won't be added at all
			expect(result.cuisine).toBeUndefined();
		});

		it('should map all 21 cuisine types correctly', () => {
			const cuisineTests = [
				{ input: 'restaurant', expected: 'Restaurant' },
				{ input: 'cafe', expected: 'Cafe' },
				{ input: 'bar', expected: 'Bar' },
				{ input: 'bakery', expected: 'Bakery' },
				{ input: 'meal_takeaway', expected: 'Takeaway' },
				{ input: 'meal_delivery', expected: 'Delivery' },
				{ input: 'food', expected: 'Food' },
				{ input: 'italian_restaurant', expected: 'Italian' },
				{ input: 'chinese_restaurant', expected: 'Chinese' },
				{ input: 'japanese_restaurant', expected: 'Japanese' },
				{ input: 'mexican_restaurant', expected: 'Mexican' },
				{ input: 'indian_restaurant', expected: 'Indian' },
				{ input: 'french_restaurant', expected: 'French' },
				{ input: 'thai_restaurant', expected: 'Thai' },
				{ input: 'american_restaurant', expected: 'American' },
				{ input: 'pizza_restaurant', expected: 'Pizza' },
				{ input: 'seafood_restaurant', expected: 'Seafood' },
				{ input: 'steakhouse', expected: 'Steakhouse' },
				{ input: 'sushi_restaurant', expected: 'Sushi' },
				{ input: 'vegetarian_restaurant', expected: 'Vegetarian' },
				{ input: 'vegan_restaurant', expected: 'Vegan' }
			];

			cuisineTests.forEach(({ input, expected }) => {
				const placeWithCuisine: GooglePlaceDetailsResponse = {
					...MOCK_PLACE_DETAILS_MINIMAL,
					types: [input]
				};

				const result = dataMapper.mapPlaceDetailsToFrontmatter(placeWithCuisine);

				expect(result.cuisine).toContain(expected);
			});
		});
	});

	describe('extractCity', () => {
		it('should extract city from locality component', () => {
			const result = dataMapper.mapPlaceDetailsToFrontmatter(MOCK_PLACE_DETAILS_FULL);

			expect(result.city).toBe('Los Angeles');
		});

		it('should return undefined when no city found', () => {
			const placeWithNoCity: GooglePlaceDetailsResponse = {
				...MOCK_PLACE_DETAILS_MINIMAL,
				addressComponents: [
					{ longText: 'United States', types: ['country'] }
				]
			};

			const result = dataMapper.mapPlaceDetailsToFrontmatter(placeWithNoCity);

			expect(result.city).toBeUndefined();
		});

		it('should handle missing addressComponents', () => {
			const placeWithNoComponents: GooglePlaceDetailsResponse = {
				...MOCK_PLACE_DETAILS_MINIMAL,
				addressComponents: undefined
			};

			const result = dataMapper.mapPlaceDetailsToFrontmatter(placeWithNoComponents);

			expect(result.city).toBeUndefined();
		});

		it('should handle empty addressComponents array', () => {
			const placeWithEmptyComponents: GooglePlaceDetailsResponse = {
				...MOCK_PLACE_DETAILS_MINIMAL,
				addressComponents: []
			};

			const result = dataMapper.mapPlaceDetailsToFrontmatter(placeWithEmptyComponents);

			expect(result.city).toBeUndefined();
		});
	});

	describe('formatFilename', () => {
		it('should replace {name} token with place name', () => {
			const result = dataMapper.formatFilename('{name}', 'Pizza Hut', 'Los Angeles');

			expect(result).toBe('Pizza Hut');
		});

		it('should replace {city} token with city', () => {
			const result = dataMapper.formatFilename('{city}', 'Pizza Hut', 'Los Angeles');

			expect(result).toBe('Los Angeles');
		});

		it('should handle format with both tokens', () => {
			const result = dataMapper.formatFilename('{name} - {city}', 'Pizza Hut', 'Los Angeles');

			expect(result).toBe('Pizza Hut - Los Angeles');
		});

		it('should handle format with no tokens', () => {
			const result = dataMapper.formatFilename('My Restaurant', 'Pizza Hut', 'Los Angeles');

			expect(result).toBe('My Restaurant');
		});

		it('should handle missing city with fallback', () => {
			const result = dataMapper.formatFilename('{name} - {city}', 'Pizza Hut', undefined);

			expect(result).toBe('Pizza Hut - Unknown');
		});

		it('should handle missing city without city token', () => {
			const result = dataMapper.formatFilename('{name}', 'Pizza Hut', undefined);

			expect(result).toBe('Pizza Hut');
		});

		it('should sanitize invalid filename characters', () => {
			const result = dataMapper.formatFilename('{name}', 'Pizza/Hut:Test', 'LA');

			expect(result).toBe('Pizza-Hut-Test');
		});
	});

	describe('sanitizeFilename', () => {
		it('should remove invalid characters: < > : " / \\ | ? *', () => {
			const result = dataMapper.formatFilename('{name}', 'Test<>:"/\\|?*Name', 'City');

			expect(result).toBe('Test---------Name');
			expect(result).not.toMatch(/[<>:"/\\|?*]/);
		});

		it('should preserve spaces and hyphens', () => {
			const result = dataMapper.formatFilename('{name}', 'Pizza Hut - Main Street', 'LA');

			expect(result).toBe('Pizza Hut - Main Street');
		});

		it('should handle empty string', () => {
			const result = dataMapper.formatFilename('', 'Pizza Hut', 'LA');

			expect(result).toBe('');
		});

		it('should handle already-sanitized filenames', () => {
			const result = dataMapper.formatFilename('{name}', 'Valid Filename', 'LA');

			expect(result).toBe('Valid Filename');
		});

		it('should handle Unicode characters', () => {
			const result = dataMapper.formatFilename('{name}', 'Café René', 'Paris');

			expect(result).toBe('Café René');
		});

		it('should handle emojis', () => {
			const result = dataMapper.formatFilename('{name}', 'Pizza 🍕 Place', 'LA');

			expect(result).toBe('Pizza 🍕 Place');
		});

		it('should handle multiple consecutive invalid characters', () => {
			const result = dataMapper.formatFilename('{name}', 'Test///Name', 'City');

			expect(result).toBe('Test---Name');
		});
	});
});
