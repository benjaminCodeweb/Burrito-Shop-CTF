export interface User {
  id: string
  name: string
  email: string
  nickname: string
  isAdmin: boolean
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  emoji: string
  category: string
}

export interface CartLine {
  id: string
  qty: number
}

export type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'delivered'

export type Fulfillment = 'pickup' | 'delivery'

export interface Order {
  id: string
  userId: string
  items: CartLine[]
  total: number
  fulfillment?: Fulfillment
  status: OrderStatus
  createdAt: number
}

export interface RenderedResource {
  url: string
  ok: boolean
  status?: number
  contentType?: string | null
  bodyPreview?: string
  error?: string
}

export interface EmailRenderReport {
  renderedAt: string
  resources: RenderedResource[]
}
