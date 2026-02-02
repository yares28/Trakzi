# World Map - Countries Reference

This file documents all countries available in the GeoJSON data, multi-part country rendering, and known limitations.

## GeoJSON Source

- **File:** `lib/data/world-countries.json`
- **Total Countries:** 176
- **Format:** GeoJSON FeatureCollection

---

## Countries in GeoJSON (176)

### Available Countries (A-Z)

Afghanistan, Albania, Algeria, Angola, Antarctica, Argentina, Armenia, Australia, Austria, Azerbaijan, Bangladesh, Belarus, Belgium, Belize, Benin, Bhutan, Bolivia, Bosnia and Herzegovina, Botswana, Brazil, Brunei, Bulgaria, Burkina Faso, Burundi, Cambodia, Cameroon, Canada, Central African Republic, Chad, Chile, China, Colombia, Costa Rica, Croatia, Cuba, Cyprus, Czech Republic, Democratic Republic of the Congo, Denmark, Djibouti, Dominican Republic, East Timor, Ecuador, Egypt, El Salvador, Equatorial Guinea, Eritrea, Estonia, Ethiopia, Falkland Islands, Fiji, Finland, France, French Southern and Antarctic Lands, Gabon, Gambia, Georgia, Germany, Ghana, Greece, Greenland, Guatemala, Guinea, Guinea Bissau, Guyana, Haiti, Honduras, Hungary, Iceland, India, Indonesia, Iran, Iraq, Ireland, Israel, Italy, Ivory Coast, Jamaica, Japan, Jordan, Kazakhstan, Kenya, Korea (South), Kosovo, Kuwait, Kyrgyzstan, Laos, Latvia, Lebanon, Lesotho, Liberia, Libya, Lithuania, Luxembourg, Macedonia, Madagascar, Malawi, Malaysia, Mali, Mauritania, Mexico, Moldova, Mongolia, Montenegro, Morocco, Mozambique, Myanmar, Namibia, Nepal, Netherlands, New Caledonia, New Zealand, Nicaragua, Niger, Nigeria, Northern Cyprus, Norway, Oman, Pakistan, Panama, Papua New Guinea, Paraguay, Peru, Philippines, Poland, Portugal, Puerto Rico, Qatar, Republic of the Congo, Romania, Russia, Rwanda, Saudi Arabia, Senegal, Serbia, Sierra Leone, Slovakia, Slovenia, Solomon Islands, Somalia, Somaliland, South Africa, South Sudan, Spain, Sri Lanka, Sudan, Suriname, Swaziland, Sweden, Switzerland, Syria, Taiwan, Tajikistan, Tanzania, Thailand, The Bahamas, Togo, Trinidad and Tobago, Tunisia, Turkey, Turkmenistan, UK, USA, Uganda, Ukraine, United Arab Emirates, Uruguay, Uzbekistan, Vanuatu, Venezuela, Vietnam, West Bank, Western Sahara, Yemen, Zambia, Zimbabwe

---

## Missing from GeoJSON

### UN Member States Missing (30)

| Category | Countries |
|----------|-----------|
| **East Asia** | North Korea, Singapore |
| **Middle East** | Bahrain |
| **Europe (Microstates)** | Monaco, Andorra, Liechtenstein, San Marino, Vatican City, Malta |
| **Caribbean** | Barbados, Grenada, Saint Lucia, Saint Vincent & the Grenadines, Antigua & Barbuda, Saint Kitts & Nevis, Dominica |
| **Indian Ocean** | Maldives, Mauritius, Seychelles, Comoros |
| **Africa** | Cape Verde, Sao Tome & Principe |
| **Pacific** | Palau, Micronesia, Marshall Islands, Nauru, Tuvalu, Kiribati, Samoa, Tonga |

### Disputed/Partially Recognized States (5)

| Territory | Status |
|-----------|--------|
| Abkhazia | De facto independent from Georgia |
| South Ossetia | De facto independent from Georgia |
| Transnistria | De facto independent from Moldova |
| Nagorno-Karabakh | Disputed, formerly Armenian-controlled |
| Sahrawi Arab Democratic Republic | Claims Western Sahara |

### Overseas Territories Missing (23+)

| Sovereign | Territories |
|-----------|-------------|
| **Denmark** | Faroe Islands |
| **UK** | Gibraltar, Bermuda, Cayman Islands, British Virgin Islands, Turks & Caicos, Montserrat, Anguilla |
| **Netherlands** | Aruba, Curacao, Sint Maarten, Bonaire, Saba, Sint Eustatius |
| **USA** | Guam, American Samoa, US Virgin Islands, Northern Mariana Islands |
| **France** | French Polynesia, Martinique, Guadeloupe, Reunion, Mayotte, French Guiana (separate from France polygon), Wallis & Futuna, Saint Pierre & Miquelon |
| **China** | Hong Kong, Macau |
| **Australia** | Christmas Island, Cocos (Keeling) Islands, Norfolk Island |
| **New Zealand** | Cook Islands, Niue, Tokelau |

### Spain's Missing Parts

The GeoJSON has Spain as a **single Polygon** (mainland only). These are NOT included:

| Territory | Location |
|-----------|----------|
| Balearic Islands | Mediterranean Sea (Mallorca, Menorca, Ibiza) |
| Canary Islands | Atlantic Ocean, off Morocco |
| Ceuta | North Africa (Spanish exclave) |
| Melilla | North Africa (Spanish exclave) |

---

## Multi-Part Country Rendering

### Status Legend
- ✅ **Good** - Outline renders correctly
- ⚠️ **Limited** - GeoJSON data incomplete
- ❌ **Not Available** - Missing from GeoJSON

### Archipelagos & Island Nations

| # | Country | Status | Notes |
|---|---------|--------|-------|
| 1 | Indonesia | ✅ | Main islands grouped, smaller as secondary |
| 2 | Philippines | ✅ | Archipelago renders well |
| 3 | Japan | ✅ | 4 main islands grouped together |
| 4 | Fiji | ✅ | Islands grouped |
| 5 | Solomon Islands | ✅ | Islands visible |
| 6 | Vanuatu | ✅ | Islands visible |
| 7 | New Zealand | ✅ | North + South Island clear |
| 8 | Papua New Guinea | ✅ | Main + smaller islands |
| 9 | The Bahamas | ✅ | Island chain visible |
| 10 | Trinidad and Tobago | ✅ | Both islands visible |

### Countries with Overseas Territories

| # | Country | Status | Notes |
|---|---------|--------|-------|
| 11 | France | ✅ | Mainland + Corsica; French Guiana excluded by proximity |
| 12 | USA | ✅ | Contiguous 48 states only; Alaska/Hawaii as secondary |
| 13 | Russia | ✅ | Main landmass; distant territories as secondary |
| 14 | Norway | ✅ | Mainland only; Svalbard excluded (too distant) |
| 15 | Denmark | ✅ | Denmark proper (Greenland separate entry) |
| 16 | Spain | ⚠️ | **Mainland only** - Canary/Balearic NOT in GeoJSON |
| 17 | Portugal | ✅ | Mainland + Azores/Madeira |
| 18 | UK | ✅ | Great Britain + smaller islands |
| 19 | Netherlands | ✅ | European mainland only |

### Countries with Significant Islands

| # | Country | Status | Notes |
|---|---------|--------|-------|
| 20 | Canada | ✅ | Mainland + Arctic archipelago |
| 21 | China | ✅ | Mainland + Hainan + coastal islands |
| 22 | India | ✅ | Mainland + Andaman & Nicobar |
| 23 | Italy | ✅ | Boot + Sicily + Sardinia |
| 24 | Greece | ✅ | Mainland + islands |
| 25 | Australia | ✅ | Mainland + Tasmania |
| 26 | Malaysia | ✅ | Peninsular + Borneo part |
| 27 | Chile | ✅ | Mainland + coastal islands |
| 28 | Argentina | ✅ | Mainland + Tierra del Fuego |
| 29 | Ecuador | ✅ | Mainland + Galapagos |
| 30 | Turkey | ✅ | European + Asian parts connected |
| 31 | Croatia | ✅ | Mainland + coastal islands |
| 32 | Estonia | ✅ | Mainland + islands |
| 33 | Finland | ✅ | Mainland + Aland |
| 34 | Sweden | ✅ | Mainland + Gotland |

### Antarctic/Remote Territories

| # | Country | Status | Notes |
|---|---------|--------|-------|
| 35 | Antarctica | ✅ | Continent shape |
| 36 | Greenland | ✅ | Large island (separate from Denmark) |
| 37 | New Caledonia | ✅ | French territory |
| 38 | French Southern and Antarctic Lands | ✅ | Remote islands |
| 39 | Falkland Islands | ✅ | British territory |

### Countries with Exclaves

| # | Country | Status | Notes |
|---|---------|--------|-------|
| 40 | Equatorial Guinea | ✅ | Mainland + Bioko island |
| 41 | Oman | ✅ | Main + Musandam exclave |
| 42 | Azerbaijan | ✅ | Main + Nakhchivan exclave |
| 43 | Angola | ✅ | Main + Cabinda exclave |

---

## Technical Implementation

### Polygon Grouping Algorithm

Countries with multiple polygons use a three-tier proximity system:

```
EXCLUDE_DISTANT (USA, Russia, Norway):
  - Proximity: 10 degrees
  - Significance: 3%
  - Effect: Keeps Alaska, Svalbard, etc. as secondary

EXTRA_WIDE_PROXIMITY (Spain, Portugal, Ecuador):
  - Proximity: 35 degrees
  - Significance: 0.1%
  - Effect: Would include distant islands IF they were in GeoJSON

INCLUDE_ALL_NEARBY (most island nations):
  - Proximity: 25 degrees
  - Significance: 0.1%
  - Effect: Groups archipelago islands together

DEFAULT (all others):
  - Proximity: 15 degrees
  - Significance: 3%
```

### Latitude Correction

All outlines use `cos(latitude)` correction to prevent horizontal distortion at high latitudes (e.g., Russia, Canada, Norway).

### Large Country Sizing

Countries with extreme aspect ratios render at 280px instead of 200px:
- Russia, USA, Canada, Antarctica, Indonesia, China

### GeoJSON Name Mapping

| GeoJSON Name | Common Name |
|--------------|-------------|
| `"UK"` | United Kingdom |
| `"USA"` | United States |
| `"Korea"` | South Korea (North Korea not included) |
| `"Ivory Coast"` | Cote d'Ivoire |
| `"Swaziland"` | Eswatini |
| `"Macedonia"` | North Macedonia |
| `"Czech Republic"` | Czechia |
| `"East Timor"` | Timor-Leste |

---

## Recommendations for Future Improvements

To add missing countries, consider replacing `world-countries.json` with a more detailed GeoJSON source:

1. **Natural Earth** (naturalearthdata.com) - Has 1:10m, 1:50m, 1:110m scales
2. **World Atlas TopoJSON** - Includes more territories
3. **OpenStreetMap extracts** - Most complete but larger file size

Priority additions for a travel/spending app:
- **Singapore** (major travel hub)
- **Maldives** (tourism destination)
- **Malta** (EU member, tourism)
- **Mauritius** (tourism destination)
- **Barbados** (Caribbean tourism)
- **North Korea** (complete Korean peninsula)
- **Hong Kong & Macau** (distinct travel destinations)
