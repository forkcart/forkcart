export interface PluginStoreListing {
  id: string;
  name: string;
  slug: string;
  packageName: string;
  description: string | null;
  shortDescription: string | null;
  author: string | null;
  authorUrl: string | null;
  version: string;
  type: string;
  category: string | null;
  icon: string | null;
  screenshots: string[];
  readme: string | null;
  pricing: string;
  price: string | null;
  currency: string;
  downloads: number;
  rating: string | null;
  ratingCount: number;
  tags: string[];
  requirements: Record<string, string>;
  repository: string | null;
  license: string | null;
  status: string;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginStoreVersion {
  id: string;
  listingId: string;
  version: string;
  packageName: string;
  changelog: string | null;
  minForkcartVersion: string | null;
  size: number | null;
  downloads: number;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface PluginStoreReview {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  helpful: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PluginStoreInstall {
  id: string;
  listingId: string;
  version: string;
  installedAt: Date;
  uninstalledAt: Date | null;
  isActive: boolean;
}

export interface ListPluginsFilter {
  search?: string;
  category?: string;
  type?: string;
  pricing?: string;
  sort?: 'downloads' | 'rating' | 'newest' | 'name';
  page?: number;
  limit?: number;
}

export interface SubmitPluginInput {
  name: string;
  slug: string;
  packageName: string;
  description?: string;
  shortDescription?: string;
  author?: string;
  authorUrl?: string;
  version: string;
  type?: string;
  category?: string;
  icon?: string;
  screenshots?: string[];
  readme?: string;
  pricing?: string;
  price?: string;
  tags?: string[];
  requirements?: Record<string, string>;
  repository?: string;
  license?: string;
  changelog?: string;
  minForkcartVersion?: string;
}

export interface PublishVersionInput {
  version: string;
  packageName: string;
  changelog?: string;
  minForkcartVersion?: string;
  size?: number;
}

export interface PluginStoreListingWithDetails extends PluginStoreListing {
  versions: PluginStoreVersion[];
  reviews: PluginStoreReview[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface UpdateAvailable {
  listingId: string;
  name: string;
  slug: string;
  installedVersion: string;
  latestVersion: string;
  changelog: string | null;
}
