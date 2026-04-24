export const validateProject = (data: {
  title: string
  description: string
  projectUrl?: string
  imageUrl?: string
}) => {
  const errors: Record<string, string> = {}

  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters'
  }

  if (!data.description || data.description.trim().length < 20) {
    errors.description = 'Description must be at least 20 characters'
  }

  if (data.projectUrl && !isValidUrl(data.projectUrl)) {
    errors.projectUrl = 'Please enter a valid URL'
  }

  if (data.imageUrl && !isValidUrl(data.imageUrl) && !data.imageUrl.startsWith('/')) {
    errors.imageUrl = 'Please enter a valid image URL'
  }

  return errors
}

export const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePhone = (phone: string) => {
  const re = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,5}[-\s\.]?[0-9]{1,5}$/
  return re.test(phone)
}