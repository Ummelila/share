import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Grid, List, Package, ArrowRight, Heart, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import AuthenticatedNavbar from '../components/AuthenticatedNavbar';

const BrowseDonations = () => {
    const navigate = useNavigate();
    const [viewType, setViewType] = useState('grid');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            // Get all approved products
            const { data: allProducts, error: productsError } = await supabase
                .from('product_donations')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            if (productsError) throw productsError;

            // Get all products that are currently in bidding (upcoming, active, ended, or completed)
            const { data: biddingProducts, error: biddingError } = await supabase
                .from('bidding_products')
                .select('product_donation_id, status, highest_bidder_name')
                .in('status', ['upcoming', 'active', 'ended', 'completed']);

            if (biddingError) {
                console.error('Error loading bidding products:', biddingError);
            }

            // Get all product requests so we can hide already requested items
            const { data: productRequests, error: requestsError } = await supabase
                .from('product_requests')
                .select('product_donation_id, status');

            if (requestsError) {
                console.error('Error loading product requests:', requestsError);
            }

            // Product IDs hidden due to bidding status
            const biddingProductIds = new Set();
            (biddingProducts || []).forEach(bp => {
                // Hide if: upcoming, active, OR (ended/completed with bids)
                if (bp.status === 'upcoming' || bp.status === 'active' || 
                    ((bp.status === 'ended' || bp.status === 'completed') && bp.highest_bidder_name)) {
                    biddingProductIds.add(bp.product_donation_id);
                }
            });

            // Product IDs hidden because they have active (non-rejected) requests
            const requestedProductIds = new Set(
                (productRequests || [])
                    .filter(r => r.status !== 'rejected')
                    .map(r => r.product_donation_id)
            );

            // Filter out products that are in bidding OR already requested
            const availableProducts = (allProducts || []).filter(
                p => !biddingProductIds.has(p.id) && !requestedProductIds.has(p.id)
            );

            setProducts(availableProducts);

            // Calculate category counts from available products
            const categoryCounts = {};
            availableProducts.forEach(product => {
                const cat = product.category || 'Other';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });

            const allCategories = [
                { id: 'all', name: 'All Items', count: availableProducts.length },
                ...Object.entries(categoryCounts).map(([name, count]) => ({
                    id: name.toLowerCase(),
                    name: name,
                    count: count
                }))
            ];

            setCategories(allCategories);
        } catch (error) {
            console.error('Error loading products:', error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const getSignedUrl = async (filePath) => {
        try {
            if (!filePath) return null;
            const { data, error } = await supabase.storage
                .from('verification-documents')
                .createSignedUrl(filePath, 3600);

            if (error) throw error;
            return data.signedUrl;
        } catch (error) {
            console.error('Error getting signed URL:', error);
            return null;
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'all' || 
            (p.category && p.category.toLowerCase() === selectedCategory);
        const matchesSearch = !searchQuery || 
            (p.product_name && p.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const isLoggedIn = !!localStorage.getItem('currentUser');

    return (
        <div className="min-h-screen bg-gray-50 animate-fade-in">
            {isLoggedIn ? <AuthenticatedNavbar /> : <Navbar />}
            
            {/* Hero Section */}
            <section className="relative py-6 bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200 rounded-full blur-3xl opacity-20 -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-200 rounded-full blur-3xl opacity-20 -ml-32 -mb-32"></div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex items-start mb-6">
                        <button
                            type="button"
                            onClick={() => navigate(isLoggedIn ? "/dashboard" : "/")}
                            className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
                        </button>
                        
                        <div className="text-center max-w-3xl mx-auto flex-1">
                            <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-900 mb-2">
                                Browse Donations
                            </h1>
                            <p className="text-sm text-gray-600">
                                Find items that can help you or request what you need
                            </p>
                        </div>
                    </div>
                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto mt-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input 
                                type="text" 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                placeholder="Search for items..." 
                                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-lg" 
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar */}
                        <div className="lg:w-64 flex-shrink-0">
                            <div className="card sticky top-24">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Filter className="w-5 h-5" /> Categories</h3>
                                <div className="space-y-2">
                                    {categories.map(cat => (
                                        <button 
                                            key={cat.id} 
                                            onClick={() => setSelectedCategory(cat.id)} 
                                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedCategory === cat.id ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 text-gray-600'}`}
                                        >
                                            <span className="flex justify-between items-center">
                                                <span>{cat.name}</span>
                                                <span className="text-sm bg-gray-200 px-2 py-0.5 rounded-full">{cat.count}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-gray-600">{filteredProducts.length} items found</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setViewType('grid')} 
                                        className={`p-2 rounded-lg ${viewType === 'grid' ? 'bg-primary-100 text-primary-600' : 'bg-white text-gray-500'}`}
                                    >
                                        <Grid className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => setViewType('list')} 
                                        className={`p-2 rounded-lg ${viewType === 'list' ? 'bg-primary-100 text-primary-600' : 'bg-white text-gray-500'}`}
                                    >
                                        <List className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600">Loading products...</p>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="card text-center py-12">
                                    <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Items Found</h3>
                                    <p className="text-gray-500">Try adjusting your search or filters</p>
                                </div>
                            ) : (
                                <div className={viewType === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                                    {filteredProducts.map(product => (
                                        <ProductCard 
                                            key={product.id} 
                                            product={product} 
                                            viewType={viewType}
                                            getSignedUrl={getSignedUrl}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const ProductCard = ({ product, viewType, getSignedUrl }) => {
    const navigate = useNavigate();
    const [imageUrl, setImageUrl] = useState(null);
    const [imageLoading, setImageLoading] = useState(true);

    useEffect(() => {
        if (product.image_url) {
            loadImage();
        } else {
            setImageLoading(false);
        }
    }, [product.image_url]);

    const loadImage = async () => {
        try {
            const url = await getSignedUrl(product.image_url);
            setImageUrl(url);
        } catch (error) {
            console.error('Error loading image:', error);
        } finally {
            setImageLoading(false);
        }
    };

    const handleRequestProduct = () => {
        const user = localStorage.getItem('currentUser');
        if (user) {
            const userData = JSON.parse(user);
            if (userData.is_verified) {
                navigate(`/product-request?productId=${product.id}`);
            } else {
                navigate('/verify-documents');
            }
        } else {
            navigate(`/login?returnUrl=/product-request&productId=${product.id}`);
        }
    };

    return (
        <div className={`card-hover overflow-hidden group ${viewType === 'list' ? 'flex gap-6' : ''}`}>
            <div className={`relative ${viewType === 'list' ? 'w-48 h-32 flex-shrink-0' : 'h-48 -mx-6 -mt-6 mb-4'} overflow-hidden`}>
                {imageLoading ? (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={product.product_name || 'Product'} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-400" />
                    </div>
                )}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-primary-600 capitalize">
                    {product.category || 'Other'}
                </div>
            </div>
            <div className={viewType === 'list' ? 'flex-1' : ''}>
                <h3 className="text-lg font-semibold text-gray-800">{product.product_name || 'Unnamed Product'}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {product.description || 'No description available'}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>By: <span className="text-gray-700">{product.user_name || 'Anonymous'}</span></span>
                </div>
                <button
                    onClick={handleRequestProduct}
                    className="mt-4 inline-flex items-center text-primary-600 font-medium hover:gap-2 transition-all"
                >
                    Request Item <ArrowRight className="w-4 h-4 ml-1" />
                </button>
            </div>
        </div>
    );
};

export default BrowseDonations;

