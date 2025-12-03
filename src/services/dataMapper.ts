import { GooglePlaceDetailsResponse, NoteFrontmatter } from '../types';

export class DataMapper {
	mapPlaceDetailsToFrontmatter(placeDetails: GooglePlaceDetailsResponse): NoteFrontmatter {
		const frontmatter: NoteFrontmatter = {};

		if (placeDetails.types && placeDetails.types.length > 0) {
			frontmatter.cuisine = this.extractCuisineTypes(placeDetails.types);
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

		if (placeDetails.photos && placeDetails.photos.length > 0) {
			const photoName = placeDetails.photos[0].name;
			frontmatter.image = `https://places.googleapis.com/v1/${photoName}/media?key=YOUR_API_KEY&maxHeightPx=400&maxWidthPx=400`;
		}

		if (placeDetails.formattedAddress) {
			frontmatter.address = placeDetails.formattedAddress;
		}

		if (placeDetails.businessStatus) {
			frontmatter.isClosed = placeDetails.businessStatus === 'CLOSED_PERMANENTLY';
		}

		if (placeDetails.location) {
			frontmatter.location = [`${placeDetails.location.latitude},${placeDetails.location.longitude}`];
		}

		return frontmatter;
	}

	private extractCuisineTypes(types: string[]): string[] {
		const cuisineMap: { [key: string]: string } = {
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
		};

		const cuisines: string[] = [];
		for (const type of types) {
			if (cuisineMap[type]) {
				cuisines.push(cuisineMap[type]);
			}
		}

		return cuisines.length > 0 ? cuisines : ['Restaurant'];
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
