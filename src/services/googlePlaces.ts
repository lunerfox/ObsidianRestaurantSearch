import { Notice, requestUrl } from 'obsidian';
import { GooglePlacesSearchResponse, GooglePlaceDetailsResponse, PlaceSearchResult } from '../types';

export class GooglePlacesService {
	private apiKey: string;
	private baseUrl = 'https://places.googleapis.com/v1';

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
		if (!this.apiKey) {
			new Notice('Configure your Google Places API key in plugin settings');
			throw new Error('API key not configured');
		}

		try {
			const response = await requestUrl({
				url: `${this.baseUrl}/places:searchText`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': this.apiKey,
					'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
				},
				body: JSON.stringify({
					textQuery: query
				})
			});

			if (response.status >= 400) {
				if (response.status === 403) {
					new Notice('Invalid API key. Please check your settings.');
					throw new Error('Invalid API key');
				}
				if (response.status === 429) {
					new Notice('Rate limit exceeded. Please try again later.');
					throw new Error('Rate limit exceeded');
				}
				throw new Error(`API request failed: ${response.status}`);
			}

			const data: GooglePlacesSearchResponse = response.json;

			if (!data.places || data.places.length === 0) {
				new Notice('No results found for your search');
				return [];
			}

			return data.places.map(place => ({
				id: place.id,
				displayName: place.displayName.text,
				formattedAddress: place.formattedAddress
			}));

		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('API key') || error.message.includes('Rate limit')) {
					throw error;
				}
				new Notice('Network error. Please check your connection.');
			}
			throw error;
		}
	}

	async getPlaceDetails(placeId: string): Promise<GooglePlaceDetailsResponse> {
		if (!this.apiKey) {
			new Notice('Configure your Google Places API key in plugin settings');
			throw new Error('API key not configured');
		}

		try {
			const response = await requestUrl({
				url: `${this.baseUrl}/places/${placeId}`,
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': this.apiKey,
					'X-Goog-FieldMask': 'id,displayName,formattedAddress,types,rating,photos,location,businessStatus,addressComponents'
				}
			});

			if (response.status >= 400) {
				if (response.status === 403) {
					new Notice('Invalid API key. Please check your settings.');
					throw new Error('Invalid API key');
				}
				if (response.status === 429) {
					new Notice('Rate limit exceeded. Please try again later.');
					throw new Error('Rate limit exceeded');
				}
				throw new Error(`API request failed: ${response.status}`);
			}

			const data: GooglePlaceDetailsResponse = response.json;
			return data;

		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('API key') || error.message.includes('Rate limit')) {
					throw error;
				}
				new Notice('Network error. Please check your connection.');
			}
			throw error;
		}
	}
}
