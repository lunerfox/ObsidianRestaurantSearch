import { GooglePlacesSearchResponse, GooglePlaceDetailsResponse } from '../../src/types';

export const MOCK_SEARCH_RESPONSE: GooglePlacesSearchResponse = {
	places: [
		{
			id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
			displayName: { text: 'Pizza Hut' },
			formattedAddress: '123 Main St, Los Angeles, CA 90001'
		},
		{
			id: 'ChIJN1t_tDeuEmsRUsoyG83frY5',
			displayName: { text: 'Pizza Hut Express' },
			formattedAddress: '456 Oak Ave, Los Angeles, CA 90002'
		}
	]
};

export const MOCK_EMPTY_SEARCH_RESPONSE: GooglePlacesSearchResponse = {
	places: []
};

export const MOCK_PLACE_DETAILS_FULL: GooglePlaceDetailsResponse = {
	id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
	displayName: { text: 'Pizza Hut' },
	formattedAddress: '123 Main St, Los Angeles, CA 90001',
	location: {
		latitude: 34.0522,
		longitude: -118.2437
	},
	rating: 4.5,
	types: ['italian_restaurant', 'pizza_restaurant', 'restaurant', 'point_of_interest', 'establishment'],
	businessStatus: 'OPERATIONAL',
	internationalPhoneNumber: '+1 555-0123',
	nationalPhoneNumber: '(555) 0123',
	photos: [
		{
			name: 'places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/photo1'
		}
	],
	addressComponents: [
		{ longText: '123', types: ['street_number'] },
		{ longText: 'Main St', types: ['route'] },
		{ longText: 'Los Angeles', types: ['locality', 'political'] },
		{ longText: 'Los Angeles County', types: ['administrative_area_level_2', 'political'] },
		{ longText: 'California', types: ['administrative_area_level_1', 'political'] },
		{ longText: 'United States', types: ['country', 'political'] },
		{ longText: '90001', types: ['postal_code'] }
	]
};

export const MOCK_PLACE_DETAILS_MINIMAL: GooglePlaceDetailsResponse = {
	id: 'ChIJN1t_tDeuEmsRUsoyG83frY6',
	displayName: { text: 'Minimal Restaurant' },
	formattedAddress: '789 Elm St, New York, NY 10001',
	location: {
		latitude: 40.7128,
		longitude: -74.0060
	},
	rating: 0,
	types: ['restaurant'],
	businessStatus: 'OPERATIONAL'
};

export const MOCK_PLACE_DETAILS_CLOSED: GooglePlaceDetailsResponse = {
	id: 'ChIJN1t_tDeuEmsRUsoyG83frY7',
	displayName: { text: 'Closed Restaurant' },
	formattedAddress: '999 Dead End, San Francisco, CA 94102',
	location: {
		latitude: 37.7749,
		longitude: -122.4194
	},
	rating: 3.0,
	types: ['restaurant'],
	businessStatus: 'CLOSED_PERMANENTLY'
};

export const MOCK_PLACE_DETAILS_CHINESE: GooglePlaceDetailsResponse = {
	id: 'ChIJN1t_tDeuEmsRUsoyG83frY8',
	displayName: { text: 'Golden Dragon' },
	formattedAddress: '555 Chinatown Ave, San Francisco, CA 94108',
	location: {
		latitude: 37.7938,
		longitude: -122.4074
	},
	rating: 4.8,
	types: ['chinese_restaurant', 'restaurant', 'food', 'point_of_interest'],
	businessStatus: 'OPERATIONAL',
	internationalPhoneNumber: '+1 415-555-8888',
	addressComponents: [
		{ longText: 'San Francisco', types: ['locality', 'political'] }
	]
};

export const MOCK_API_ERROR_403 = {
	status: 403,
	message: 'API key not valid. Please pass a valid API key.'
};

export const MOCK_API_ERROR_429 = {
	status: 429,
	message: 'You have exceeded your daily request quota for this API.'
};

export const MOCK_API_ERROR_500 = {
	status: 500,
	message: 'Internal server error'
};
