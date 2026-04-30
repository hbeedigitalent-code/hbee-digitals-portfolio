export interface Project {
  id: number | string
  name: string
  category: string
  result: string
  image: string
  tag: string
  featured?: boolean
  description?: string
  url?: string
  created_at?: string
}

export const projects: Project[] = []

export interface Category {
  id: string
  label: string
  icon: string
}

export const categories: Category[] = [
  { id: 'all', label: 'All', icon: '/icons/portfolio/all.svg' },
  { id: 'logos', label: 'Logos', icon: '/icons/portfolio/logos.svg' },
  { id: 'clothing-fashion', label: 'Clothing / Fashion', icon: '/icons/portfolio/clothing-fashion.svg' },
  { id: 'kids-clothing', label: 'Kids Clothing', icon: '/icons/portfolio/kids-clothing.svg' },
  { id: 'jewellery', label: 'Jewellery', icon: '/icons/portfolio/jewellery.svg' },
  { id: 'food', label: 'Food', icon: '/icons/portfolio/food.svg' },
  { id: 'tea-coffee', label: 'Tea / Coffee', icon: '/icons/portfolio/tea-coffee.svg' },
  { id: 'skin-care', label: 'Skin Care', icon: '/icons/portfolio/skin-care.svg' },
  { id: 'health-care', label: 'Health Care', icon: '/icons/portfolio/health-care.svg' },
  { id: 'sports-fitness', label: 'Sports / Fitness', icon: '/icons/portfolio/sports-fitness.svg' },
  { id: 'pets', label: 'Pets', icon: '/icons/portfolio/pets.svg' },
]

export const getCategoryLabel = (categoryId: string): string => {
  const category = categories.find(c => c.id === categoryId)
  return category ? category.label : categoryId
}