import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Heart,
    HeartHandshake,
    Package,
    Gavel,
    Users,
    TrendingUp,
    Shield,
    CheckCircle,
    ArrowRight,
    Star,
    Gift,
    Coins,
    Clock
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const GALLERY_IMAGES = [
    { src: 'https://images.unsplash.com/photo-1488521787991-7bbb851a4f90?w=800&q=80', alt: 'Volunteers helping in the community' },
    { src: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80', alt: 'Donation boxes and supplies' },
    { src: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&q=80', alt: 'Hands coming together in support' },
];

const HomePage = () => {
    const [stats, setStats] = useState([
        { icon: Coins, value: 'Rs. 0', label: 'Cash Donated' },
        { icon: Package, value: '0', label: 'Products Shared' },
        { icon: Users, value: '0', label: 'Lives Touched' },
        { icon: HeartHandshake, value: '0', label: 'Active Donors' },
    ]);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHomePageData();
    }, []);

    const formatNumber = (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M+';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K+';
        }
        return num.toString();
    };

    const formatCurrency = (amount) => {
        if (amount >= 1000000) {
            return 'Rs. ' + (amount / 1000000).toFixed(1) + 'M+';
        } else if (amount >= 1000) {
            return 'Rs. ' + (amount / 1000).toFixed(1) + 'K+';
        }
        return 'Rs. ' + amount.toLocaleString();
    };

    const loadHomePageData = async () => {
        try {
            // Fetch all stats in parallel
            const [cashDonationsRes, productDonationsRes, usersRes, approvedRequestsRes] = await Promise.all([
                supabase.from('cash_donations').select('amount').eq('status', 'approved'),
                supabase.from('product_donations').select('id').eq('status', 'approved'),
                supabase.from('users').select('id'),
                supabase.from('cash_requests').select('id').eq('status', 'approved'),
            ]);

            // Calculate total cash donated
            const totalCashDonated = (cashDonationsRes.data || []).reduce((sum, d) => sum + Number(d.amount || 0), 0);
            
            // Count products shared
            const productsShared = (productDonationsRes.data || []).length;
            
            // Count total users
            const totalUsers = (usersRes.data || []).length;
            
            // Count lives touched (approved requests)
            const livesTouched = (approvedRequestsRes.data || []).length;
            
            // Count active donors (users who have made approved donations)
            const { data: activeDonorsData } = await supabase
                .from('cash_donations')
                .select('user_id')
                .eq('status', 'approved');
            const uniqueDonors = new Set((activeDonorsData || []).map(d => d.user_id));
            const activeDonors = uniqueDonors.size;

            // Update stats
            setStats([
                { icon: Coins, value: formatCurrency(totalCashDonated), label: 'Cash Donated' },
                { icon: Package, value: formatNumber(productsShared), label: 'Products Shared' },
                { icon: Users, value: formatNumber(livesTouched || totalUsers), label: 'Lives Touched' },
                { icon: HeartHandshake, value: formatNumber(activeDonors), label: 'Active Donors' },
            ]);

            // Fetch featured products (latest 3 approved products)
            const { data: productsData } = await supabase
                .from('product_donations')
                .select('id, product_name, category, image_url')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(3);

            if (productsData && productsData.length > 0) {
                setFeaturedProducts(productsData.map(p => ({
                    id: p.id,
                    name: p.product_name || 'Donated Item',
                    category: p.category,
                    image: p.image_url || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=300&fit=crop'
                })));
            } else {
                // Fallback to dummy data if no products
                setFeaturedProducts([
                    { id: 1, name: 'Winter Clothes Bundle', category: 'Clothing', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=300&fit=crop' },
                    { id: 2, name: 'Study Books Set', category: 'Education', image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=300&fit=crop' },
                    { id: 3, name: 'Kitchen Essentials', category: 'Household', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop' },
                ]);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error loading home page data:', error);
            setLoading(false);
        }
    };

    const features = [
        {
            icon: Shield,
            title: 'Verified Recipients',
            description: 'Every recipient is thoroughly verified to ensure your donations reach those truly in need.',
        },
        {
            icon: TrendingUp,
            title: 'Transparent Tracking',
            description: 'Track your donations from submission to delivery with complete transparency.',
        },
        {
            icon: Gavel,
            title: 'Unique Bidding',
            description: 'Bid on antique and unique items. All proceeds go to those in need.',
        },
        {
            icon: CheckCircle,
            title: 'AI-Powered Safety',
            description: 'Advanced AI ensures only safe, legal items are accepted for donation.',
        },
    ];

    const howItWorks = [
        { step: 1, title: 'Sign Up', description: 'Create your account as a donor or recipient', icon: Users },
        { step: 2, title: 'Get Verified', description: 'Recipients upload documents for verification', icon: Shield },
        { step: 3, title: 'Donate or Request', description: 'Donors give, recipients request help', icon: Gift },
        { step: 4, title: 'Transform Lives', description: 'Your generosity creates lasting impact', icon: Heart },
    ];

    const testimonials = [
        {
            name: 'Ahmed Khan',
            role: 'Donor',
            image: 'https://images.unsplash.com/photo-1666433616111-e1a398ab878c?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            quote: 'Share4Good made it so easy to donate. I love seeing exactly how my contributions help others.',
            rating: 5,
        },
        {
            name: 'Fatima Ali',
            role: 'Recipient',
            image: 'https://images.unsplash.com/photo-1764740146693-4955d02c98f9?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            quote: 'Thanks to Share4Good, I received the medical help I desperately needed. Forever grateful!',
            rating: 5,
        },
        {
            name: 'Hassan Raza',
            role: 'Donor',
            image: 'https://images.unsplash.com/photo-1722354980566-ec247cb4f1a8?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            quote: 'The transparency here is unmatched. I know exactly where my donations go.',
            rating: 5,
        },
    ];


    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="relative overflow-hidden min-h-[600px] flex items-center">
                {/* Background Image & Overlay */}
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1600&q=80')" }}
                ></div>
                {/* Primary theme color overlay */}
                <div className="absolute inset-0 bg-primary-900/40"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-800/60 to-transparent"></div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full z-10">
                    <div className="max-w-3xl">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full border border-white/20 text-sm font-medium mb-6 backdrop-blur-md">
                            <Heart className="w-4 h-4 text-[#1db5f4]" fill="currentColor" />
                            <span>Making a difference together</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-montserrat tracking-tight">
                            Share4Good
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-10 leading-relaxed font-open-sans">
                            Connect with your community. Donate products, contribute cash, 
                            or bid on items to support those in need.
                        </p>

                        {/* Custom Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link 
                                to="/signup" 
                                className="bg-[#1db5f4] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#159bd4] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/25"
                            >
                                Get Started
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link 
                                to="/how-it-works" 
                                className="border border-white/30 bg-white/10 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/20 transition-all flex items-center justify-center shadow-lg"
                            >
                                Learn More
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Photo strip — visual break */}
            <section className="py-6 bg-white border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 rounded-2xl overflow-hidden shadow-lg ring-1 ring-gray-100">
                        {GALLERY_IMAGES.map((img, i) => (
                            <div key={i} className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden group">
                                <img
                                    src={img.src}
                                    alt={img.alt}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-60" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className="text-center p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="w-14 h-14 mx-auto bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                                    <stat.icon className="w-7 h-7 text-primary-600" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900 font-poppins">{stat.value}</div>
                                <div className="text-gray-500 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">Why Choose <span className="gradient-text">Share4Good</span></h2>
                        <p className="section-subtitle mt-4">
                            We've built trust through transparency, verification, and genuine impact
                        </p>
                    </div>

                    <div className="hidden lg:block mb-12 rounded-2xl overflow-hidden shadow-card border border-gray-100">
                        <img
                            src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=1200&q=80"
                            alt="Community support and giving"
                            className="w-full h-56 object-cover"
                            loading="lazy"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="card-hover group"
                            >
                                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3 font-poppins">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">How <span className="gradient-text">It Works</span></h2>
                        <p className="section-subtitle mt-4">
                            Simple steps to start making a difference today
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {howItWorks.map((item, index) => (
                            <div key={index} className="relative">
                                <div className="text-center">
                                    <div className="relative inline-block">
                                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center shadow-lg">
                                            <item.icon className="w-10 h-10 text-white" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                                            {item.step}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2 font-poppins">
                                        {item.title}
                                    </h3>
                                    <p className="text-gray-600">{item.description}</p>
                                </div>

                                {index < howItWorks.length - 1 && (
                                    <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-300 to-transparent"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Donations */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-12">
                        <div>
                            <h2 className="section-title">Featured <span className="gradient-text">Donations</span></h2>
                            <p className="text-gray-600 mt-2">Browse available items ready for those in need</p>
                        </div>
                        <Link to="/browse" className="mt-4 md:mt-0 text-primary-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                            View All Donations
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    {featuredProducts.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-8">
                            {featuredProducts.map((product) => (
                                <div key={product.id} className="card-hover overflow-hidden group">
                                    <div className="relative h-48 -mx-6 -mt-6 mb-4 overflow-hidden">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-primary-600">
                                            {product.category}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-800">{product.name}</h3>
                                    <Link to="/browse" className="mt-4 inline-flex items-center text-primary-600 font-medium hover:gap-2 transition-all">
                                        View Details <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p>No featured products available at the moment.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="section-title">What Our <span className="gradient-text">Community</span> Says</h2>
                        <p className="section-subtitle mt-4">
                            Real stories from real people making a real difference
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className="card flex flex-col">
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 text-accent-500" fill="currentColor" />
                                    ))}
                                </div>
                                <p className="text-gray-600 italic mb-6">"{testimonial.quote}"</p>
                                <div className="flex items-center gap-4 mt-auto">
                                    <img
                                        src={testimonial.image}
                                        alt={testimonial.name}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div>
                                        <p className="font-semibold text-gray-800">{testimonial.name}</p>
                                        <p className="text-sm text-primary-600">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-20 overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            "url(https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1600&q=80)",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-800/88 to-primary-700/85" />
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-white font-poppins mb-6">
                        Ready to Make a Difference?
                    </h2>
                    <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                        Join thousands of generous hearts already transforming lives.
                        Your contribution, big or small, creates lasting impact.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/signup"
                            className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <Heart className="w-5 h-5" />
                            Donate Now
                        </Link>
                        <Link
                            to="/signup"
                            className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                            Request Help
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;

