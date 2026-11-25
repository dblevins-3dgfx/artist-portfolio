/*
 * Public venue read (#41). The JSON import is the file baked into the build.
 * parseVenues() validates the stored records and toPublicVenue() strips the
 * desk-only fields (contact and notes) so they cannot reach a public page.
 */
import venuesJson from "../../content/venues.json";
import { parseVenues, toPublicVenue, type PublicVenue } from "@/lib/venues";

const publicVenues: PublicVenue[] = parseVenues(venuesJson).map(toPublicVenue);

export function getPublicVenues(): PublicVenue[] {
  return publicVenues;
}
