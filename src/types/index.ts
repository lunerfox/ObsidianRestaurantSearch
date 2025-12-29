export interface PlaceTemplate {
	name: string;
	path: string; // empty string means "No Template"
	targetFolder?: string; // Optional: override global targetFolder for this template
}

export interface GooglePlacesPluginSettings {
	apiKey: string;
	templateFilePath: string; // Deprecated - kept for migration only
	templates: PlaceTemplate[];
	rememberLastTemplate: boolean;
	lastUsedTemplateIndex: number;
	targetFolder: string;
	filenameFormat: string;
	downloadImages: boolean;
	imageFolder: string;
	batchUpdateAddressField: string;
	batchUpdateRateLimit: number;
	batchUpdateUseFilenameAsFallback: boolean;
	batchUpdateAutoSelectSingleResult: boolean;
	restaurants: {
		cuisineMappings: { [key: string]: string };
	};
}

export const DEFAULT_SETTINGS: GooglePlacesPluginSettings = {
	apiKey: '',
	templateFilePath: '', // Deprecated - kept for migration only
	templates: [
		{ name: 'No Template', path: '' }
	],
	rememberLastTemplate: true,
	lastUsedTemplateIndex: 0,
	targetFolder: '',
	filenameFormat: '{name}',
	downloadImages: true,
	imageFolder: 'attachments/places',
	batchUpdateAddressField: 'address',
	batchUpdateRateLimit: 500,
	batchUpdateUseFilenameAsFallback: true,
	batchUpdateAutoSelectSingleResult: true,
	restaurants: {
		cuisineMappings: {
			'restaurant': 'Restaurant',
			'cafe': 'Cafe',
			'bar': 'Bar',
			'bakery': 'Bakery',
			'meal_takeaway': 'Takeaway',
			'meal_delivery': 'Delivery',
			'food': 'Food',
			'italian_restaurant': 'Italian',
			'chinese_restaurant': 'Chinese',
			'japanese_restaurant': 'Japanese',
			'mexican_restaurant': 'Mexican',
			'indian_restaurant': 'Indian',
			'french_restaurant': 'French',
			'thai_restaurant': 'Thai',
			'american_restaurant': 'American',
			'pizza_restaurant': 'Pizza',
			'seafood_restaurant': 'Seafood',
			'steakhouse': 'Steakhouse',
			'sushi_restaurant': 'Sushi',
			'vegetarian_restaurant': 'Vegetarian',
			'vegan_restaurant': 'Vegan'
		}
	}
};

export interface PlaceSearchResult {
	id: string;
	displayName: string;
	formattedAddress: string;
}

export interface PlaceDetails {
	id: string;
	name: string;
	formattedAddress: string;
	types: string[];
	rating: number;
	photoReference?: string;
	location: {
		latitude: number;
		longitude: number;
	};
	businessStatus: string;
}

export interface NoteFrontmatter {
	cuisine?: string[];
	city?: string;
	'rating-google'?: number;
	link?: string;
	image?: string;
	address?: string;
	phone?: string;
	isClosed?: boolean;
	location?: string[];
	[key: string]: unknown;
}

export interface GooglePlacesSearchResponse {
	places: Array<{
		id: string;
		displayName: {
			text: string;
		};
		formattedAddress: string;
	}>;
}

export interface GooglePlaceDetailsResponse {
	id: string;
	displayName: {
		text: string;
	};
	formattedAddress: string;
	types: string[];
	rating: number;
	photos?: Array<{
		name: string;
	}>;
	location: {
		latitude: number;
		longitude: number;
	};
	businessStatus: string;
	internationalPhoneNumber?: string;
	nationalPhoneNumber?: string;
	addressComponents?: Array<{
		types: string[];
		longText: string;
	}>;
}
