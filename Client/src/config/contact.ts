export const businessContact = {
	businessName: 'OG Gainz',
	email: 'oggainzofficial@gmail.com',
	emailHref: 'mailto:oggainzofficial@gmail.com',
	phone: '+91 93617 98644',
	phoneHref: 'tel:+919361798644',
	phoneDigits: '919361798644',
	googleMapsUrl: 'https://maps.app.goo.gl/g89t9Vo5q3XAzcGP8',
	googleMapsLabel: 'View on Google Maps',
	addressLines: ['OG Gainz', 'Perumbakkam', 'Chennai \u2013 600100', 'Tamil Nadu, India'],
};

export const formatAddress = (separator = '\n') => businessContact.addressLines.join(separator);
