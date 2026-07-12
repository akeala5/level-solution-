export interface User {
  id: string
  email: string
  phone?: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'MODERATOR' | 'SELLER' | 'BUYER'
  isEmailVerified: boolean
  isPhoneVerified: boolean
  isKycVerified: boolean
  twoFactorEnabled: boolean
  plan?: string
  profile?: Profile
  sellerProfile?: SellerProfile
  subscription?: Subscription
  loyaltyAccount?: LoyaltyAccount
  createdAt: string
}

export interface Profile {
  id: string
  avatarUrl?: string
  bio?: string
  city?: string
  country: string
  language: string
  currency: string
  notificationPreferences?: Record<string, boolean>
}

export interface SellerProfile {
  id: string
  shopName: string
  shopSlug: string
  shopDescription?: string
  shopBannerUrl?: string
  shopLogoUrl?: string
  shopCity?: string
  shopCountry: string
  shopPhone?: string
  shopWhatsapp?: string
  totalSales: number
  avgRating: number
  totalReviews: number
  isBadgePro: boolean
  isBadgeVerified: boolean
}

export interface Subscription {
  plan: 'FREE' | 'BASIC' | 'ESSENTIAL' | 'PREMIUM' | 'PRO' | 'BUSINESS'
  status: string
  expiresAt?: string
}

export interface LoyaltyAccount {
  points: number
  level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
}

export interface Category {
  id: string
  name: string
  nameEn: string
  slug: string
  description?: string
  iconUrl?: string
  imageUrl?: string
  parentId?: string
  children?: Category[]
  _count?: { products: number }
}

export interface AuctionBid {
  id: string
  bidderId: string
  amount: number
  isAuto: boolean
  createdAt: string
}

export interface Auction {
  id: string
  productId: string
  startingPrice: number
  currentPrice: number
  reservePrice?: number
  minBidIncrement: number
  startsAt: string
  endsAt: string
  status: 'ACTIVE' | 'ENDED' | 'CANCELLED'
  winnerId?: string
  product: {
    id: string
    title: string
    description?: string
    images: { id: string; url: string }[]
    seller?: { id: string; firstName: string; lastName: string }
  }
  bids?: AuctionBid[]
  _count?: { bids: number }
}

export interface ProductImage {
  id: string
  url: string
  thumbnailUrl?: string
  order: number
  isPrimary: boolean
}

export interface Product {
  id: string
  sellerId: string
  categoryId: string
  title: string
  slug: string
  description: string
  price: number
  originalPrice?: number
  condition: 'NEW' | 'VERY_GOOD' | 'GOOD' | 'FAIR' | 'FOR_PARTS'
  status: string
  brand?: string
  model?: string
  quantity: number
  city?: string
  country: string
  viewCount: number
  favoriteCount: number
  guarantee: string
  hasDelivery: boolean
  deliveryPrice?: number
  isNegotiable: boolean
  isReconditioned: boolean
  isFeatured: boolean
  isFlash: boolean
  flashEndsAt?: string
  isBundle: boolean
  bundleItems?: { name: string; quantity: number; unitPrice?: number }[]
  bundleDiscount?: number
  publishedAt?: string
  createdAt: string
  images: ProductImage[]
  category: { name: string; nameEn: string; slug: string }
  seller: {
    id: string
    firstName: string
    lastName?: string
    isKycVerified?: boolean
    sellerProfile?: Partial<SellerProfile>
    profile?: { avatarUrl?: string }
  }
  tags?: { tag: string }[]
  _count?: { reviews: number; favorites: number }
  isFavorite?: boolean
  similar?: Product[]
  reviews?: Review[]
}

export interface Order {
  id: string
  orderNumber: string
  buyerId: string
  sellerId: string
  status: string
  totalAmount: number
  commissionAmount: number
  sellerAmount: number
  deliveryAmount: number
  trackingNumber?: string
  trackingUrl?: string
  notes?: string
  createdAt: string
  deliveredAt?: string
  completedAt?: string
  items: OrderItem[]
  buyer?: Partial<User>
  seller?: Partial<User>
  payment?: Payment
  review?: Review
  dispute?: Dispute
}

export interface OrderItem {
  id: string
  productId: string
  title: string
  price: number
  quantity: number
  imageUrl?: string
  product?: Partial<Product>
}

export interface Payment {
  id: string
  amount: number
  currency: string
  method: string
  status: string
  providerRef?: string
  createdAt: string
}

export interface Review {
  id: string
  orderId?: string
  productId: string
  giverId: string
  receiverId: string
  rating: number
  ratingComm?: number
  ratingDesc?: number
  ratingDelivery?: number
  comment?: string
  sellerReply?: string
  createdAt: string
  giver?: { firstName: string; profile?: { avatarUrl?: string } }
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  imageUrl?: string
  isRead: boolean
  createdAt: string
  sender?: { id: string; firstName: string; lastName: string; profile?: { avatarUrl?: string } }
}

export interface Conversation {
  id: string
  productId?: string
  updatedAt: string
  members: ConversationMember[]
  messages: Message[]
  unreadCount?: number
}

export interface ConversationMember {
  userId: string
  user: Partial<User>
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
  data?: Record<string, any>
}

export interface Dispute {
  id: string
  orderId: string
  reason: string
  description: string
  status: string
  createdAt: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ApiResponse<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  meta?: PaginationMeta
}

export interface CartItem {
  productId: string
  title: string
  price: number
  quantity: number
  imageUrl?: string
  sellerId: string
  sellerName?: string
  hasDelivery: boolean
  deliveryPrice?: number
}
