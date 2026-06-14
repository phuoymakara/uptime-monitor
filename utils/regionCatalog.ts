export interface RegionEntry {
  value: string      // e.g. 'asia-singapore'
  label: string      // e.g. 'Asia — Singapore'
  continent: string  // e.g. 'Asia'
  country: string    // e.g. 'Singapore' (short display name)
}

export const REGION_CATALOG: RegionEntry[] = [
  // Asia
  { value: 'asia-cambodia',    continent: 'Asia',          country: 'Cambodia (Phnom Penh)',  label: 'Asia — Cambodia (Phnom Penh)'         },
  { value: 'asia-singapore',   continent: 'Asia',          country: 'Singapore',              label: 'Asia — Singapore'                     },
  { value: 'asia-thailand',    continent: 'Asia',          country: 'Thailand (Bangkok)',     label: 'Asia — Thailand (Bangkok)'            },
  { value: 'asia-vietnam',     continent: 'Asia',          country: 'Vietnam (Ho Chi Minh)',  label: 'Asia — Vietnam (Ho Chi Minh)'         },
  { value: 'asia-malaysia',    continent: 'Asia',          country: 'Malaysia (KL)',          label: 'Asia — Malaysia (Kuala Lumpur)'       },
  { value: 'asia-indonesia',   continent: 'Asia',          country: 'Indonesia (Jakarta)',    label: 'Asia — Indonesia (Jakarta)'           },
  { value: 'asia-philippines', continent: 'Asia',          country: 'Philippines (Manila)',   label: 'Asia — Philippines (Manila)'          },
  { value: 'asia-myanmar',     continent: 'Asia',          country: 'Myanmar (Yangon)',       label: 'Asia — Myanmar (Yangon)'              },
  { value: 'asia-india',       continent: 'Asia',          country: 'India (Mumbai)',         label: 'Asia — India (Mumbai)'                },
  { value: 'asia-japan',       continent: 'Asia',          country: 'Japan (Tokyo)',          label: 'Asia — Japan (Tokyo)'                 },
  { value: 'asia-korea',       continent: 'Asia',          country: 'South Korea (Seoul)',    label: 'Asia — South Korea (Seoul)'           },
  { value: 'asia-hongkong',    continent: 'Asia',          country: 'Hong Kong',              label: 'Asia — Hong Kong'                     },
  { value: 'asia-taiwan',      continent: 'Asia',          country: 'Taiwan (Taipei)',        label: 'Asia — Taiwan (Taipei)'               },
  // Europe
  { value: 'europe-germany',     continent: 'Europe',      country: 'Germany (Frankfurt)',    label: 'Europe — Germany (Frankfurt)'         },
  { value: 'europe-uk',          continent: 'Europe',      country: 'UK (London)',            label: 'Europe — United Kingdom (London)'     },
  { value: 'europe-france',      continent: 'Europe',      country: 'France (Paris)',         label: 'Europe — France (Paris)'              },
  { value: 'europe-netherlands', continent: 'Europe',      country: 'Netherlands (Amsterdam)',label: 'Europe — Netherlands (Amsterdam)'     },
  { value: 'europe-poland',      continent: 'Europe',      country: 'Poland (Warsaw)',        label: 'Europe — Poland (Warsaw)'             },
  { value: 'europe-sweden',      continent: 'Europe',      country: 'Sweden (Stockholm)',     label: 'Europe — Sweden (Stockholm)'          },
  // North America
  { value: 'north-america-us-east', continent: 'North America', country: 'US East (New York)',   label: 'North America — US East (New York)'   },
  { value: 'north-america-us-west', continent: 'North America', country: 'US West (Los Angeles)',label: 'North America — US West (Los Angeles)' },
  { value: 'north-america-canada',  continent: 'North America', country: 'Canada (Toronto)',      label: 'North America — Canada (Toronto)'     },
  // South America
  { value: 'south-america-brazil', continent: 'South America', country: 'Brazil (São Paulo)',  label: 'South America — Brazil (São Paulo)'   },
  // Oceania
  { value: 'oceania-sydney',     continent: 'Oceania',     country: 'Australia (Sydney)',     label: 'Oceania — Australia (Sydney)'         },
  { value: 'oceania-melbourne',  continent: 'Oceania',     country: 'Australia (Melbourne)',  label: 'Oceania — Australia (Melbourne)'      },
]

// Fast lookup: region code → short country label
const _countryMap: Record<string, string> = Object.fromEntries(
  REGION_CATALOG.map(r => [r.value, r.country])
)

/**
 * Human-readable label for a region code. Safe for unknown/legacy codes.
 *   'asia-singapore' → 'Singapore'
 *   'local'          → 'Local'
 *   'all'            → 'All Regions'
 *   'asia'           → 'Asia'  (legacy fallback)
 */
export function formatRegionLabel(r: string): string {
  if (r === 'all')   return 'All Regions'
  if (r === 'local') return 'Local'
  if (_countryMap[r]) return _countryMap[r]
  // Generic fallback: title-case each hyphen-separated word
  return r.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Flat { label, value } list for <Select :options="..."> */
export const REGION_SELECT_OPTIONS = REGION_CATALOG.map(r => ({
  label: r.label,
  value: r.value,
}))
