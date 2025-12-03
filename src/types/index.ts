export interface GooglePlacesPluginSettings {
	apiKey: string;
	templateFilePath: string;
	targetFolder: string;
	filenameFormat: string;
}

export const DEFAULT_SETTINGS: GooglePlacesPluginSettings = {
	apiKey: '',
	templateFilePath: '',
	targetFolder: '',
	filenameFormat: '{name}'
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
	isClosed?: boolean;
	location?: [number, number];
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
	addressComponents?: Array<{
		types: string[];
		longText: string;
	}>;
}
