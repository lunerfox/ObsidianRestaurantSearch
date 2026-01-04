import { GooglePlaceDetailsResponse, NoteFrontmatter, GooglePlacesPluginSettings } from '../types';

export class DataMapper {
	constructor(private settings: GooglePlacesPluginSettings) {}

	mapPlaceDetailsToFrontmatter(placeDetails: GooglePlaceDetailsResponse): NoteFrontmatter {
		const frontmatter: NoteFrontmatter = {};

		// Only add cuisine if types exist and mapping produces results
		if (placeDetails.types && placeDetails.types.length > 0) {
			const cuisines = this.extractCuisineTypes(placeDetails.types);
			if (cuisines.length > 0) {
				frontmatter.cuisine = cuisines;
			}
		}

		if (placeDetails.addressComponents) {
			const city = this.extractCity(placeDetails.addressComponents);
			if (city) {
				frontmatter.city = city;
			}
		}

		if (placeDetails.rating) {
			frontmatter['rating-google'] = placeDetails.rating;
		}

		if (placeDetails.id) {
			frontmatter.link = `https://www.google.com/maps/place/?q=place_id:${placeDetails.id}`;
		}

		// Image will be handled by the modal based on downloadImages setting
		// Don't set image URL here - let the modal handle it

		if (placeDetails.formattedAddress) {
			frontmatter.address = placeDetails.formattedAddress;
		}

		if (placeDetails.internationalPhoneNumber || placeDetails.nationalPhoneNumber) {
			frontmatter.phone = placeDetails.internationalPhoneNumber || placeDetails.nationalPhoneNumber;
		}

		if (placeDetails.businessStatus) {
			frontmatter.isClosed = placeDetails.businessStatus === 'CLOSED_PERMANENTLY';
		}

		if (placeDetails.location) {
			frontmatter.location = [
				String(placeDetails.location.latitude),
				String(placeDetails.location.longitude)
			];
		}

		return frontmatter;
	}

	private extractCuisineTypes(types: string[]): string[] {
		const cuisineMap = this.settings.restaurants.cuisineMappings;

		const cuisines: string[] = [];
		for (const type of types) {
			if (cuisineMap[type]) {
				cuisines.push(cuisineMap[type]);
			}
		}

		// Return empty array if no cuisine types found (removed hardcoded fallback)
		return cuisines;
	}

	private extractCity(addressComponents: Array<{ types: string[]; longText: string }>): string | undefined {
		for (const component of addressComponents) {
			if (component.types.includes('locality')) {
				return component.longText;
			}
		}
		return undefined;
	}

	formatFilename(format: string, placeName: string, city?: string): string {
		let filename = format;
		filename = filename.replace('{name}', placeName);
		filename = filename.replace('{city}', city || 'Unknown');
		return this.sanitizeFilename(filename);
	}

	private sanitizeFilename(filename: string): string {
		return filename.replace(/[\\/:*?"<>|]/g, '-');
	}
}
