/** Maps a community to the provider email that owns its clubhouse dining menu. */
export function diningProviderEmail(communityId?: string | null): string {
  if (communityId === "iron-lake") return "dining@theclubatironlake.com";
  if (communityId === "heritage-bay") return "dining@golfheritagebay.com";
  if (communityId === "hunters-ridge") return "dining@huntersridge-ca.com";
  if (communityId === "bonita-bay") return "dining@bonitabayclub.net";
  if (communityId === "shadow-wood") return "dining@shadowwoodcc.com";
  if (communityId === "heron-creek") return "dining@heroncreekgcc.com";
  if (communityId === "debary") return "dining@debarycc.com";
  if (communityId === "jacaranda") return "dining@jacarandagolfclub.com";
  if (communityId === "the-dunes") return "dining@sanibeldunesresort.com";
  if (communityId === "martin-downs") return "dining@martindownsgolfclub.com";
  if (communityId === "the-nest") return "dining@nestgolf.com";
  if (communityId === "seagate") return "dining@seagatedelray.com";
  if (communityId === "copperleaf") return "dining@copperleafgolf.com";
  if (communityId === "club-renaissance") return "dining@clubrenaissance.com";
  if (communityId === "falls-club") return "dining@thefallsclub.com";
  if (communityId === "worthington") return "dining@worthingtoncc.com";
  if (communityId === "estero") return "dining@esterocc.com";
  if (communityId === "wildcat-run") return "dining@wildcatruncc.com";
  if (communityId === "highland-woods") return "dining@hwgcc.com";
  if (communityId === "bonita-national") return "dining@bonitanationalgolfcc.com";
  if (communityId === "carrollwood") return "dining@carrollwoodcc.com";
  if (communityId === "windsor") return "dining@windsorflorida.com";
  if (communityId === "spanish-wells") return "dining@spanishwellscountryclub.com";
  if (communityId === "harbor-pointe") return "dining@harborpointehoa.com";
  if (communityId === "willow-creek") return "dining@willowcreekhoa.com";
  if (communityId === "alliant") return "dining@alliantproperty.com";
  // Cassie only for Golden Ocala — empty beats leaking her menu into other clubs.
  if (communityId === "golden-ocala") return "cassiesmeticuloustouch@gmail.com";
  return "";
}
