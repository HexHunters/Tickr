export const collections = [
  {
    slug: 'concerts',
    category: 'CONCERT',
    label: 'Concerts',
    title: 'Le son, en vrai.',
    description:
      'Concerts en Tunisie : retrouvez les prochaines dates, les salles et les informations pour votre prochaine soirée live.',
    introduction:
      'Une voix qu’on connaît. Un groupe qu’on découvre. Le plaisir d’être dans la salle quand tout commence.',
    photo: '/images/live-crowd.jpg',
    tone: 'sage',
  },
  {
    slug: 'festivals',
    category: 'FESTIVAL',
    label: 'Festivals',
    title: 'On reste encore.',
    description:
      'Les festivals en Tunisie : découvrez les événements publiés, leurs dates, leurs lieux et les billets proposés.',
    introduction:
      'Des découvertes au fil du programme. Une scène, puis une autre. Et aucune envie de rentrer tout de suite.',
    photo: '/images/festival.jpg',
    tone: 'lilac',
  },
  {
    slug: 'spectacles',
    category: 'THEATER',
    label: 'Théâtre',
    title: 'La salle retient son souffle.',
    description:
      'Théâtre en Tunisie : découvrez les spectacles publiés, les horaires, les lieux et les informations de billetterie.',
    introduction:
      'Le rideau se lève. Une histoire prend vie. Ce soir, on laisse la scène nous surprendre.',
    photo: '/images/stage.jpg',
    tone: 'shell',
  },
  {
    slug: 'ateliers',
    category: 'WORKSHOP',
    label: 'Ateliers',
    title: 'À vous de jouer.',
    description:
      'Ateliers en Tunisie : trouvez une activité, découvrez les prochaines sessions et consultez les informations pratiques.',
    introduction:
      'Essayer un geste. Apprendre ensemble. Repartir avec autre chose qu’un bon souvenir.',
    photo: '/images/jazz.jpg',
    tone: 'butter',
  },
]

export interface DiscoveryFilters {
  query: string
  category: string
  city: string
  sort: string
  page: number
}

export function discoveryPath(filters: DiscoveryFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    limit: '12',
  })
  if (filters.query) params.set('q', filters.query)
  else {
    if (filters.category) params.set('category', filters.category)
    if (filters.city) params.set('city', filters.city)
    params.set('sortBy', filters.sort)
    params.set('sortOrder', 'ASC')
  }
  return `events${filters.query ? '/search' : ''}?${params}`
}

export function discoveryHref(filters: Partial<DiscoveryFilters>): string {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.category) params.set('category', filters.category)
  if (filters.city) params.set('city', filters.city)
  if (filters.sort && filters.sort !== 'startDate')
    params.set('sort', filters.sort)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  return params.size ? `/events?${params}` : '/events'
}
