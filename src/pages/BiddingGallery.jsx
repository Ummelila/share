import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Gavel, Clock, TrendingUp, Eye, Heart, ArrowRight, Timer, Filter, X, ArrowLeft, Sparkles, Calendar, User, DollarSign, History, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { createNotification } from '../utils/notifications';
import Navbar from '../components/Navbar';
import AuthenticatedNavbar from '../components/AuthenticatedNavbar';
import CustomDropdown from '../components/CustomDropdown';

const BiddingGallery = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // all, active, upcoming
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, ending-soon, price-low, price-high
    const [auctions, setAuctions] = useState([]);
    const [filteredAuctions, setFilteredAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        activeAuctions: 0,
        totalRaised: 0,
        activeBidders: 0
    });
    
    // Bid modal states
    const [showBidModal, setShowBidModal] = useState(false);
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [bidLoading, setBidLoading] = useState(false);
    const [bidFeedback, setBidFeedback] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    
    // Product detail modal states
    const [showProductDetail, setShowProductDetail] = useState(false);
    const [selectedProductForView, setSelectedProductForView] = useState(null);
    const [productImageUrl, setProductImageUrl] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);
    const [showBidHistory, setShowBidHistory] = useState(false);
    const [bidModalImageUrl, setBidModalImageUrl] = useState(null);
    
    // Image cache to prevent repeated API calls
    const imageCache = useRef(new Map());
    
    // My Bids drawer states
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerTab, setDrawerTab] = useState('active');
    const [myBids, setMyBids] = useState({ active: [], history: [] });

    // All categories from database
    const allCategories = [
        'Electronics',
        'Clothing',
        'Furniture',
        'Books',
        'Toys',
        'Food Items',
        'Medical Supplies',
        'Educational Materials',
        'Other'
    ];

    useEffect(() => {
        // Initial load
        loadBiddingData();
        
        // Auto-refresh every 2 minutes to update statuses (upcoming -> active, active -> ended)
        // Reduced frequency to improve performance
        const interval = setInterval(() => {
            loadBiddingData();
        }, 120000); // 2 minutes instead of 30 seconds
        
        return () => clearInterval(interval);
    }, []);

    // Filter and sort auctions
    useEffect(() => {
        let filtered = [...auctions];

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(auction => auction.status === statusFilter);
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(auction => 
                auction.product_category?.toLowerCase() === selectedCategory.toLowerCase()
            );
        }

        // Sort products
        if (sortBy === 'oldest') {
            filtered.sort((a, b) => new Date(a.created_at || a.bid_start_date) - new Date(b.created_at || b.bid_start_date));
        } else if (sortBy === 'ending-soon') {
            filtered.sort((a, b) => new Date(a.bid_end_date) - new Date(b.bid_end_date));
        } else if (sortBy === 'price-low') {
            filtered.sort((a, b) => (a.current_highest_bid || a.starting_price) - (b.current_highest_bid || b.starting_price));
        } else if (sortBy === 'price-high') {
            filtered.sort((a, b) => (b.current_highest_bid || b.starting_price) - (a.current_highest_bid || a.starting_price));
        } else {
            // Default: newest first
            filtered.sort((a, b) => new Date(b.created_at || b.bid_start_date) - new Date(a.created_at || a.bid_start_date));
        }

        setFilteredAuctions(filtered);
    }, [auctions, statusFilter, selectedCategory, sortBy]);

    const loadBiddingData = async () => {
        try {
            setLoading(true);
            
            // Load active and upcoming bidding products
            const { data: productsData, error: productsError } = await supabase
                .from('bidding_products')
                .select('*')
                .in('status', ['active', 'upcoming'])
                .order('bid_start_date', { ascending: true });

            if (productsError) throw productsError;

            const now = new Date();
            const statusUpdates = []; // Track products that need status updates in database
            
            const processedProducts = (productsData || []).map(product => {
                const startDate = new Date(product.bid_start_date);
                const endDate = new Date(product.bid_end_date);
                
                let status = product.status;
                if (now < startDate) {
                    status = 'upcoming';
                } else if (now >= startDate && now <= endDate) {
                    status = 'active';
                } else {
                    status = 'ended';
                }
                
                // If calculated status differs from database status, mark for update
                if (product.status !== status && product.status !== 'completed' && product.status !== 'cancelled') {
                    statusUpdates.push({ id: product.id, newStatus: status });
                }

                // Calculate time remaining
                const timeRemaining = endDate - now;
                const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                
                let endsIn = '';
                if (days > 0) {
                    endsIn = `${days}d ${hours}h`;
                } else if (hours > 0) {
                    endsIn = `${hours}h ${minutes}m`;
                } else {
                    endsIn = `${minutes}m`;
                }

                return {
                    ...product,
                    status,
                    endsIn: status === 'active' ? endsIn : null,
                    featured: product.status === 'active' && product.current_highest_bid > product.starting_price * 2
                };
            }).filter(p => p.status === 'active' || p.status === 'upcoming');

            // Update database statuses for products that changed
            if (statusUpdates.length > 0) {
                for (const update of statusUpdates) {
                    // Find the product data before update
                    const productBeforeUpdate = productsData.find(p => p.id === update.id);
                    
                    // Check if bid ended with no bids
                    const hasBids = productBeforeUpdate.current_highest_bid && productBeforeUpdate.current_highest_bid > productBeforeUpdate.starting_price;
                    
                    // If bid ended with no bids, delete from bidding_products so it can appear in browse products again
                    if (update.newStatus === 'ended' && !hasBids && !productBeforeUpdate.highest_bidder_name) {
                        // Delete the bidding product so it becomes available in browse products again
                        await supabase
                            .from('bidding_products')
                            .delete()
                            .eq('id', update.id);
                        console.log(`Bidding product ${update.id} deleted (no bids placed), product available in browse again`);
                        continue; // Skip status update for this product
                    }
                    
                    // If bid ended and has a winner, set winner and send notifications
                    if (update.newStatus === 'ended' && productBeforeUpdate.highest_bidder_id && !productBeforeUpdate.winner_id) {
                        // Set winner in database
                        await supabase
                            .from('bidding_products')
                            .update({ 
                                status: update.newStatus, 
                                winner_id: productBeforeUpdate.highest_bidder_id,
                                winner_name: productBeforeUpdate.highest_bidder_name,
                                winner_email: productBeforeUpdate.highest_bidder_email,
                                updated_at: new Date().toISOString() 
                            })
                            .eq('id', update.id);
                        
                        // Send detailed notification to winner
                        await createNotification(
                            productBeforeUpdate.highest_bidder_id,
                            'bid_won',
                            `🎉 Congratulations! You Won the Bid`,
                            `Congratulations! You won the bid for "${productBeforeUpdate.product_name}" with a bid of ${formatCurrency(parseFloat(productBeforeUpdate.current_highest_bid))}.\n\n📋 Next Steps:\n1. Please transfer your payments at Meezan Bank\nAccount Number: 01234567890123\nAccount Title: Share For Good\n2. Admin will arrange delivery after payment verification\n3. You will receive updates via notifications\n\nThank you for participating!`,
                            update.id
                        );
                        
                        // Get all unique users who participated in this bid (excluding winner)
                        const { data: allBids, error: bidsError } = await supabase
                            .from('bids')
                            .select('user_id, user_name, user_email')
                            .eq('bidding_product_id', update.id)
                            .neq('user_id', productBeforeUpdate.highest_bidder_id);
                        
                        if (!bidsError && allBids && allBids.length > 0) {
                            // Get unique participants
                            const uniqueParticipants = allBids.reduce((acc, bid) => {
                                if (!acc.find(u => u.user_id === bid.user_id)) {
                                    acc.push({
                                        user_id: bid.user_id,
                                        user_name: bid.user_name,
                                        user_email: bid.user_email
                                    });
                                }
                                return acc;
                            }, []);
                            
                            // Send general notification to all participants
                            const participantNotifications = uniqueParticipants.map(participant =>
                                createNotification(
                                    participant.user_id,
                                    'bid_ended',
                                    `⏰ Bid Ended: "${productBeforeUpdate.product_name}"`,
                                    `The bid for "${productBeforeUpdate.product_name}" has ended.\n\n🏆 Winner: ${productBeforeUpdate.highest_bidder_name}\n💰 Winning Bid: ${formatCurrency(parseFloat(productBeforeUpdate.current_highest_bid))}\n\nThank you for participating! Keep bidding on other items.`,
                                    update.id
                                )
                            );
                            
                            // Send all notifications in parallel
                            Promise.all(participantNotifications).catch(error => {
                                console.error('Error sending notifications to participants:', error);
                            });
                        }
                        
                        continue; // Skip the regular status update below
                    }
                    
                    // Update status in database
                    await supabase
                        .from('bidding_products')
                        .update({ status: update.newStatus, updated_at: new Date().toISOString() })
                        .eq('id', update.id);
                }
            }

            setAuctions(processedProducts);

            // Calculate stats
            const activeCount = processedProducts.filter(p => p.status === 'active').length;
            
            // Calculate total raised from completed auctions with verified payments only
            const { data: completedProducts } = await supabase
                .from('bidding_products')
                .select('current_highest_bid, payment_verified, status')
                .eq('status', 'completed')
                .eq('payment_verified', true);
            
            const totalRaised = (completedProducts || [])
                .reduce((sum, p) => sum + Number(p.current_highest_bid || 0), 0);

            // Count unique bidders
            const { data: bidsData } = await supabase
                .from('bids')
                .select('user_id')
                .in('bidding_product_id', processedProducts.map(p => p.id));

            const uniqueBidders = new Set((bidsData || []).map(b => b.user_id));
            
            setStats({
                activeAuctions: activeCount,
                totalRaised: totalRaised,
                activeBidders: uniqueBidders.size
            });

        } catch (error) {
            console.error('Error loading bidding data:', error);
            setAuctions([]);
        } finally {
            setLoading(false);
        }
    };

    const getSignedUrl = async (filePath) => {
        try {
            if (!filePath) return null;
            
            // Check cache first
            if (imageCache.current.has(filePath)) {
                const cached = imageCache.current.get(filePath);
                // Check if cache is still valid (signed URLs expire after 1 hour, refresh after 50 minutes)
                if (Date.now() - cached.timestamp < 50 * 60 * 1000) {
                    return cached.url;
                }
            }
            
            const { data, error } = await supabase.storage
                .from('verification-documents')
                .createSignedUrl(filePath, 3600);

            if (error) throw error;
            
            // Cache the URL
            imageCache.current.set(filePath, {
                url: data.signedUrl,
                timestamp: Date.now()
            });
            
            return data.signedUrl;
        } catch (error) {
            console.error('Error getting signed URL:', error);
            return null;
        }
    };

    const formatCurrency = (amount) => {
        if (amount >= 1000000) {
            return 'Rs. ' + (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return 'Rs. ' + (amount / 1000).toFixed(1) + 'K';
        }
        return 'Rs. ' + amount.toLocaleString();
    };
    
    // Load current user
    useEffect(() => {
        const user = localStorage.getItem('currentUser');
        setCurrentUser(user ? JSON.parse(user) : null);
    }, []);
    
    // Load user's bids
    const loadMyBids = useCallback(async () => {
        if (!currentUser) {
            setMyBids({ active: [], history: [] });
            return;
        }
        
        try {
            // Get all bids by current user
            const { data: userBids, error: bidsError } = await supabase
                .from('bids')
                .select('*, bidding_products(*)')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            
            if (bidsError) throw bidsError;
            
            if (!userBids || userBids.length === 0) {
                setMyBids({ active: [], history: [] });
                return;
            }
            
            // Get all bidding products to check status
            const productIds = [...new Set(userBids.map(b => b.bidding_product_id))];
            const { data: products, error: productsError } = await supabase
                .from('bidding_products')
                .select('*')
                .in('id', productIds);
            
            if (productsError) throw productsError;
            
            const productsMap = {};
            (products || []).forEach(p => {
                productsMap[p.id] = p;
            });
            
            const now = new Date();
            const activeBids = [];
            const historyBids = [];
            
            // Group bids by product and get highest bid per product
            const bidsByProduct = {};
            userBids.forEach(bid => {
                const productId = bid.bidding_product_id;
                if (!bidsByProduct[productId]) {
                    bidsByProduct[productId] = [];
                }
                bidsByProduct[productId].push(bid);
            });
            
            // Process each product
            const imagePromises = [];
            
            Object.keys(bidsByProduct).forEach(productId => {
                const product = productsMap[productId];
                if (!product) return;
                
                const userBidsForProduct = bidsByProduct[productId];
                const highestUserBid = userBidsForProduct.reduce((max, bid) => 
                    parseFloat(bid.bid_amount) > parseFloat(max.bid_amount) ? bid : max
                );
                
                const startDate = new Date(product.bid_start_date);
                const endDate = new Date(product.bid_end_date);
                const isActive = now >= startDate && now <= endDate;
                const isEnded = now > endDate;
                
                const currentHighestBid = parseFloat(product.current_highest_bid || product.starting_price);
                const userBidAmount = parseFloat(highestUserBid.bid_amount);
                const isWinning = product.highest_bidder_id === currentUser.id;
                const isOutbid = !isWinning && currentHighestBid > userBidAmount;
                
                // Calculate time remaining
                let endsIn = '';
                if (isActive) {
                    const timeRemaining = endDate - now;
                    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                    
                    if (days > 0) {
                        endsIn = `${days}d ${hours}h`;
                    } else if (hours > 0) {
                        endsIn = `${hours}h ${minutes}m`;
                    } else {
                        endsIn = `${minutes}m`;
                    }
                }
                
                const bidData = {
                    id: product.id,
                    name: product.product_name,
                    myBid: userBidAmount,
                    currentBid: currentHighestBid,
                    image: 'https://via.placeholder.com/400x300?text=Loading...',
                    product: product
                };
                
                // Load image asynchronously
                if (product.product_image_url) {
                    imagePromises.push(
                        getSignedUrl(product.product_image_url)
                            .then(url => {
                                bidData.image = url;
                            })
                            .catch(() => {
                                bidData.image = 'https://via.placeholder.com/400x300?text=No+Image';
                            })
                    );
                } else {
                    bidData.image = 'https://via.placeholder.com/400x300?text=No+Image';
                }
                
                if (isActive) {
                    bidData.status = isWinning ? 'Winning' : 'Outbid';
                    bidData.endsIn = endsIn;
                    activeBids.push(bidData);
                } else if (isEnded) {
                    const won = product.winner_id === currentUser.id;
                    bidData.status = won ? 'Won' : 'Lost';
                    bidData.finalPrice = currentHighestBid;
                    bidData.date = new Date(product.bid_end_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    });
                    historyBids.push(bidData);
                }
            });
            
            // Set bids first, then update images as they load
            setMyBids({
                active: activeBids,
                history: historyBids
            });
            
            // Update images after they load
            Promise.all(imagePromises).then(() => {
                setMyBids(prev => ({
                    active: prev.active.map(b => {
                        const updated = activeBids.find(ab => ab.id === b.id);
                        return updated ? { ...b, image: updated.image } : b;
                    }),
                    history: prev.history.map(b => {
                        const updated = historyBids.find(hb => hb.id === b.id);
                        return updated ? { ...b, image: updated.image } : b;
                    })
                }));
            });
        } catch (error) {
            console.error('Error loading my bids:', error);
            setMyBids({ active: [], history: [] });
        }
    }, [currentUser, getSignedUrl]);
    
    // Load my bids when user changes or auctions update
    useEffect(() => {
        if (currentUser) {
            loadMyBids();
        }
    }, [currentUser, auctions, loadMyBids]);
    
    // Handle place bid
    const handlePlaceBid = useCallback(async (auction) => {
        if (!currentUser) {
            navigate(`/login?returnUrl=${encodeURIComponent('/bidding-gallery')}&productId=${auction.id}&openBid=true`);
            return;
        }
        setSelectedAuction(auction);
        setShowBidModal(true);
        setBidAmount('');
        setBidFeedback(null);
        setBidModalImageUrl(null);
        setBidHistory([]);
        setShowBidHistory(false);
        
        // Load image and bid history for bid modal
        if (auction.product_image_url) {
            const url = await getSignedUrl(auction.product_image_url);
            setBidModalImageUrl(url);
        }
        await loadBidHistory(auction.id);
    }, [currentUser, navigate, getSignedUrl]);
    
    // Load bid history
    const loadBidHistory = async (productId) => {
        try {
            const { data, error } = await supabase
                .from('bids')
                .select('*')
                .eq('bidding_product_id', productId)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            setBidHistory(data || []);
        } catch (error) {
            console.error('Error loading bid history:', error);
            setBidHistory([]);
        }
    };
    
    // View product details
    const handleViewDetails = async (auction) => {
        setSelectedProductForView(auction);
        setShowProductDetail(true);
        setProductImageUrl(null);
        setBidHistory([]);
        setShowBidHistory(false);
        
        // Load image and bid history
        if (auction.product_image_url) {
            const url = await getSignedUrl(auction.product_image_url);
            setProductImageUrl(url);
        }
        await loadBidHistory(auction.id);
    };
    
    // Close product detail modal
    const closeProductDetail = () => {
        setShowProductDetail(false);
        setSelectedProductForView(null);
        setProductImageUrl(null);
        setBidHistory([]);
        setShowBidHistory(false);
    };
    
    // Close bid modal
    const closeBidModal = () => {
        setShowBidModal(false);
        setSelectedAuction(null);
        setBidAmount('');
        setBidFeedback(null);
        setBidModalImageUrl(null);
        setBidHistory([]);
        setShowBidHistory(false);
    };
    
    // Submit bid
    const handleSubmitBid = async () => {
        if (!selectedAuction || !currentUser) return;
        
        const bidAmountNum = parseFloat(bidAmount);
        if (!bidAmount || isNaN(bidAmountNum) || bidAmountNum <= 0) {
            setBidFeedback({ type: 'error', message: 'Please enter a valid bid amount.' });
            return;
        }
        
        const currentHighestBid = parseFloat(selectedAuction.current_highest_bid || selectedAuction.starting_price);
        if (bidAmountNum <= currentHighestBid) {
            setBidFeedback({ 
                type: 'error', 
                message: `Your bid must be higher than the current highest bid of ${formatCurrency(currentHighestBid)}.` 
            });
            return;
        }
        
        const now = new Date();
        const endDate = new Date(selectedAuction.bid_end_date);
        if (now > endDate) {
            setBidFeedback({ type: 'error', message: 'Bidding has ended for this product.' });
            return;
        }
        
        setBidLoading(true);
        setBidFeedback(null);
        
        try {
            const { error: bidError } = await supabase
                .from('bids')
                .insert([{
                    bidding_product_id: selectedAuction.id,
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    user_email: currentUser.email,
                    bid_amount: bidAmountNum,
                }]);
            
            if (bidError) throw bidError;
            
            // Get all unique users who have bid on this product (excluding the current bidder)
            const { data: previousBids, error: bidsError } = await supabase
                .from('bids')
                .select('user_id, user_name, user_email')
                .eq('bidding_product_id', selectedAuction.id)
                .neq('user_id', currentUser.id); // Exclude current bidder
            
            if (!bidsError && previousBids && previousBids.length > 0) {
                // Get unique users (in case same user bid multiple times)
                const uniqueUsers = previousBids.reduce((acc, bid) => {
                    if (!acc.find(u => u.user_id === bid.user_id)) {
                        acc.push({
                            user_id: bid.user_id,
                            user_name: bid.user_name,
                            user_email: bid.user_email
                        });
                    }
                    return acc;
                }, []);
                
                // Send notifications to all previous bidders
                const notificationPromises = uniqueUsers.map(user => 
                    createNotification(
                        user.user_id,
                        'bid_outbid',
                        `💰 New Higher Bid on "${selectedAuction.product_name}"`,
                        `Someone placed a higher bid of ${formatCurrency(bidAmountNum)} on "${selectedAuction.product_name}".\n\nCurrent highest bid: ${formatCurrency(bidAmountNum)}\n\nPlace a new bid to stay in the competition!`,
                        selectedAuction.id
                    )
                );
                
                // Send all notifications in parallel (don't wait for them to complete)
                Promise.all(notificationPromises).catch(error => {
                    console.error('Error sending notifications to previous bidders:', error);
                });
            }
            
            setBidFeedback({ 
                type: 'success', 
                message: `Successfully placed bid of ${formatCurrency(bidAmountNum)}!` 
            });
            
            // Reload auctions to update bid counts (only if needed)
            // Don't reload immediately, let the auto-refresh handle it
            // Or reload after a short delay to avoid blocking UI
            setTimeout(() => {
                loadBiddingData();
            }, 1000);
            
            // Reload bid history if viewing product details or bid modal
            if (selectedProductForView && selectedProductForView.id === selectedAuction.id) {
                await loadBidHistory(selectedAuction.id);
            }
            // Reload bid history in bid modal
            if (showBidModal) {
                await loadBidHistory(selectedAuction.id);
            }
            
            // Close modal after 2 seconds
            setTimeout(() => {
                closeBidModal();
            }, 2000);
            
        } catch (error) {
            console.error('Error placing bid:', error);
            setBidFeedback({ 
                type: 'error', 
                message: error.message || 'Failed to place bid. Please try again.' 
            });
        } finally {
            setBidLoading(false);
        }
    };
    
    // Auto-open bid modal after login
    useEffect(() => {
        if (!currentUser || !auctions.length || showBidModal) return;
        
        const searchParams = new URLSearchParams(location.search);
        const productId = searchParams.get('productId');
        const openBid = searchParams.get('openBid') === 'true';
        
        if (productId && openBid) {
            const auction = auctions.find(a => a.id === parseInt(productId));
            if (auction && auction.status === 'active') {
                setSelectedAuction(auction);
                setShowBidModal(true);
                setBidAmount('');
                setBidFeedback(null);
                // Clean URL
                navigate('/bidding-gallery', { replace: true });
            }
        }
    }, [currentUser, auctions, location.search, showBidModal, navigate]);

    const isLoggedIn = !!currentUser;

    return (
        <div className="min-h-screen bg-gray-50 animate-fade-in">
            {isLoggedIn ? <AuthenticatedNavbar /> : <Navbar />}
            
            {/* Drawer Overlay */}
            {isDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
                    onClick={() => setIsDrawerOpen(false)}
                />
            )}

            {/* My Bids Drawer */}
            {isLoggedIn && (
                <aside className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl transform transition-transform duration-500 ease-out p-0 flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 border-b flex items-center justify-between bg-white sticky top-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 font-poppins">My Biddings</h2>
                            <p className="text-xs text-gray-500">Track your participation activity</p>
                        </div>
                        <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>

                    <div className="flex p-2 bg-gray-50 m-6 rounded-xl">
                        <button
                            onClick={() => setDrawerTab('active')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${drawerTab === 'active' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Gavel className="w-4 h-4" /> Active ({myBids.active.length})
                        </button>
                        <button
                            onClick={() => setDrawerTab('history')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${drawerTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <History className="w-4 h-4" /> History ({myBids.history.length})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
                        {drawerTab === 'active' ? (
                            myBids.active.length === 0 ? (
                                <div className="text-center py-12">
                                    <Gavel className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">No active bids</p>
                                    <p className="text-sm text-gray-400 mt-2">Start bidding on items to see them here</p>
                                </div>
                            ) : (
                                myBids.active.map(bid => (
                                    <div key={bid.id} className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary-200 transition-colors shadow-sm">
                                        <div className="flex gap-4 mb-4">
                                            <img 
                                                src={bid.image} 
                                                alt={bid.name} 
                                                className="w-16 h-16 rounded-xl object-cover"
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 truncate mb-1">{bid.name}</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${bid.status === 'Winning' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {bid.status}
                                                    </span>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Timer className="w-3 h-3" /> {bid.endsIn}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end p-3 bg-gray-50 rounded-xl">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Your Bid</p>
                                                <p className="font-bold text-gray-900">Rs. {bid.myBid.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Current</p>
                                                <p className={`font-bold ${bid.status === 'Outbid' ? 'text-red-500' : 'text-green-500'}`}>Rs. {bid.currentBid.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            myBids.history.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500">No bid history</p>
                                    <p className="text-sm text-gray-400 mt-2">Your completed bids will appear here</p>
                                </div>
                            ) : (
                                myBids.history.map(bid => (
                                    <div key={bid.id} className="p-4 rounded-2xl border border-gray-100 bg-white opacity-80">
                                        <div className="flex gap-4 mb-4">
                                            <img 
                                                src={bid.image} 
                                                alt={bid.name} 
                                                className="w-16 h-16 rounded-xl object-cover grayscale"
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-gray-800 truncate mb-1">{bid.name}</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${bid.status === 'Won' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {bid.status}
                                                    </span>
                                                    <span className="text-xs text-gray-400">{bid.date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center p-3 border border-t border-gray-50 rounded-xl">
                                            <p className="text-sm font-medium text-gray-600">Final Price</p>
                                            <p className="font-bold text-gray-900 text-lg">Rs. {bid.finalPrice.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </aside>
            )}
            
            {/* Hero Section */}
            <section className="relative py-6 bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200 rounded-full blur-3xl opacity-20 -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-200 rounded-full blur-3xl opacity-20 -ml-32 -mb-32"></div>
                
                <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-8 relative z-10">
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
                                Bidding Gallery
                            </h1>
                            <p className="text-sm text-gray-600">
                                Bid on unique and antique items. All proceeds support our charitable causes.
                            </p>
                        </div>
                    </div>
                    {/* Stats & Quick Access Bar */}
                    <div className="w-full mt-4">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                            <div className="flex flex-wrap justify-center lg:justify-start gap-8">
                                {[
                                    { icon: Gavel, value: stats.activeAuctions.toString(), label: 'Active Auctions' },
                                    { icon: TrendingUp, value: formatCurrency(stats.totalRaised), label: 'Total Raised' },
                                    { icon: Eye, value: stats.activeBidders.toString(), label: 'Active Bidders' },
                                ].map((stat, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                            <stat.icon className="w-6 h-6 text-primary-600" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 font-poppins">{stat.value}</p>
                                            <p className="text-sm text-gray-500">{stat.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Quick Access Bar - My Bids */}
                            {isLoggedIn && (
                                <button
                                    onClick={() => setIsDrawerOpen(true)}
                                    className="w-full lg:w-auto flex items-center justify-between gap-4 bg-gray-900 text-white p-2 pl-4 pr-2 rounded-2xl hover:bg-gray-800 transition-all shadow-xl shadow-gray-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-3">
                                            {myBids.active.slice(0, 2).map((b, i) => (
                                                <img 
                                                    key={i} 
                                                    src={b.image} 
                                                    className="w-8 h-8 rounded-full border-2 border-gray-900 object-cover" 
                                                    alt={b.name}
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">My Biddings</p>
                                            <p className="text-sm font-semibold">
                                                {myBids.active.length} Active • <span className="text-green-400">Winning {myBids.active.filter(b => b.status === 'Winning').length}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 p-2 rounded-xl">
                                        <ChevronRight className="w-5 h-5 text-white/70" />
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="py-8 bg-gray-50">
                <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-8">
                    <div className="card bg-white shadow-sm border border-gray-100">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                    <Filter className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold font-poppins text-gray-900">Filter & Sort</h3>
                                    <p className="text-sm text-gray-500">Refine your search</p>
                                </div>
                            </div>
                            
                            {/* Results Count */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 font-medium">
                                    Showing <span className="text-primary-600 font-bold">{filteredAuctions.length}</span> of <span className="text-gray-900 font-bold">{auctions.length}</span> auctions
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Status Filter */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold font-poppins text-gray-700 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary-600" />
                                    Status
                                </label>
                                <CustomDropdown
                                    options={[
                                        { value: "all", label: "All Status" },
                                        { value: "active", label: "🟢 Active" },
                                        { value: "upcoming", label: "⏰ Upcoming" }
                                    ]}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold font-poppins text-gray-700 flex items-center gap-2">
                                    <Gavel className="w-4 h-4 text-primary-600" />
                                    Category
                                </label>
                                <CustomDropdown
                                    options={[
                                        { value: "all", label: "All Categories" },
                                        ...allCategories.map(cat => ({ value: cat, label: cat }))
                                    ]}
                                    value={selectedCategory}
                                    onChange={setSelectedCategory}
                                />
                            </div>

                            {/* Sort By */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold font-poppins text-gray-700 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary-600" />
                                    Sort By
                                </label>
                                <CustomDropdown
                                    options={[
                                        { value: "newest", label: "Newest First" },
                                        { value: "oldest", label: "Oldest First" },
                                        { value: "ending-soon", label: "Ending Soon" },
                                        { value: "price-low", label: "Price: Low to High" },
                                        { value: "price-high", label: "Price: High to Low" }
                                    ]}
                                    value={sortBy}
                                    onChange={setSortBy}
                                />
                            </div>
                        </div>

                        {/* Clear Filters Button */}
                        {(statusFilter !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest') && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setSelectedCategory('all');
                                        setSortBy('newest');
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 hover:border-red-300 transition-all font-semibold text-sm font-poppins"
                                >
                                    <X className="w-4 h-4" />
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Auctions Grid */}
            <section className="py-12 bg-gray-50">
                <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-8">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading auctions...</p>
                        </div>
                    ) : filteredAuctions.length === 0 ? (
                        <div className="card text-center py-12">
                            <Gavel className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Auctions Available</h3>
                            <p className="text-gray-500">Check back soon for new bidding opportunities</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredAuctions.map(auction => (
                                <AuctionCard 
                                    key={auction.id} 
                                    auction={auction} 
                                    getSignedUrl={getSignedUrl}
                                    formatCurrency={formatCurrency}
                                    onPlaceBid={handlePlaceBid}
                                    onViewDetails={handleViewDetails}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA */}
            {!isLoggedIn && (
                <section className="py-16 bg-gradient-to-r from-primary-500 to-primary-600">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <Gavel className="w-16 h-16 mx-auto text-white/80 mb-6" />
                        <h2 className="text-3xl font-bold text-white font-poppins mb-4">Want to Participate?</h2>
                        <p className="text-xl text-white/90 mb-8">Sign up to place bids and win unique items while supporting a good cause.</p>
                        <Link to="/signup" className="bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg inline-flex items-center gap-2">
                            Create Free Account <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </section>
            )}

            {/* Bid Modal */}
            {showBidModal && selectedAuction && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
                    onClick={closeBidModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <Gavel className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold font-poppins text-gray-900">Place Your Bid</h2>
                                    <p className="text-sm text-gray-500">{selectedAuction.product_name || "Unnamed Product"}</p>
                                </div>
                            </div>
                            <button 
                                onClick={closeBidModal}
                                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content - Side by Side */}
                        <div className="overflow-y-auto flex-1 p-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left Side - Image Only */}
                                <div>
                                    {bidModalImageUrl ? (
                                        <div className="rounded-xl overflow-hidden bg-gray-100">
                                            <img 
                                                src={bidModalImageUrl} 
                                                alt={selectedAuction.product_name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-xl bg-gray-100 flex items-center justify-center h-full min-h-[400px]">
                                            <span className="text-gray-400">No image available</span>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side - Form and Bid Info */}
                                <div>
                                    {/* Bid History Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowBidHistory(!showBidHistory)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors mb-4"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {showBidHistory ? "Hide" : "View"} Bid History
                                    </button>

                                    {/* Bid History */}
                                    {showBidHistory && (
                                        <div className="card bg-gray-50 mb-4">
                                            <h4 className="font-semibold font-poppins text-gray-900 mb-4">Recent Bids</h4>
                                            {bidHistory.length === 0 ? (
                                                <p className="text-gray-500 text-center py-4">No bids yet. Be the first to bid!</p>
                                            ) : (
                                                <div className="space-y-3 max-h-48 overflow-y-auto">
                                                    {bidHistory.map((bid) => (
                                                        <div key={bid.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-600">{new Date(bid.created_at).toLocaleString()}</p>
                                                            </div>
                                                            <span className="text-lg font-bold text-primary-600">
                                                                {formatCurrency(parseFloat(bid.bid_amount))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Current Bid Info */}
                                    <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-200 mb-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <DollarSign className="w-5 h-5" />
                                                    <span className="font-medium">Starting Price</span>
                                                </div>
                                                <span className="text-lg font-bold text-gray-900">
                                                    {formatCurrency(parseFloat(selectedAuction.starting_price))}
                                                </span>
                                            </div>
                                            <div className="border-t border-primary-200 pt-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <TrendingUp className="w-5 h-5" />
                                                        <span className="font-medium">Current Highest Bid</span>
                                                    </div>
                                                    <span className="text-2xl font-bold text-primary-600">
                                                        {formatCurrency(parseFloat(selectedAuction.current_highest_bid || selectedAuction.starting_price))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bid Form */}
                                    <form onSubmit={(e) => { e.preventDefault(); handleSubmitBid(); }} className="space-y-6">
                                <div>
                                    <label htmlFor="bid-amount" className="label flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        Your Bid Amount (PKR) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        id="bid-amount"
                                        min={parseFloat(selectedAuction.current_highest_bid || selectedAuction.starting_price) + 1}
                                        step="0.01"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(e.target.value)}
                                        placeholder={`Enter amount higher than ${formatCurrency(parseFloat(selectedAuction.current_highest_bid || selectedAuction.starting_price))}`}
                                        required
                                        className="input-field"
                                    />
                                    <small className="text-gray-500 text-sm mt-2 block">
                                        Your bid must be higher than the current highest bid.
                                    </small>
                                </div>

                                {bidFeedback && (
                                    <div
                                        className={`p-4 rounded-xl flex items-center gap-3 ${
                                            bidFeedback.type === "success"
                                                ? "bg-green-50 text-green-700 border border-green-200"
                                                : "bg-red-50 text-red-700 border border-red-200"
                                        }`}
                                    >
                                        <span className="text-xl">
                                            {bidFeedback.type === "success" ? "✅" : "❌"}
                                        </span>
                                        <span className="font-medium">{bidFeedback.message}</span>
                                    </div>
                                )}



                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeBidModal}
                                        disabled={bidLoading}
                                        className="btn-secondary flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={bidLoading || !bidAmount.trim()}
                                        className={`btn-primary flex-1 ${bidLoading ? 'btn-loading' : ''}`}
                                    >
                                        {bidLoading ? 'Placing Bid...' : (
                                            <span className="flex items-center justify-center gap-2">
                                                <Gavel className="w-5 h-5" />
                                                Place Bid
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Product Detail Modal */}
            {showProductDetail && selectedProductForView && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
                    onClick={closeProductDetail}
                >
                    <div
                        className="bg-white rounded-2xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold font-poppins text-gray-900">Product Details</h2>
                            <button 
                                onClick={closeProductDetail}
                                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto flex-1 p-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Image */}
                                {productImageUrl ? (
                                    <div className="rounded-2xl overflow-hidden bg-gray-100">
                                        <img 
                                            src={productImageUrl} 
                                            alt={selectedProductForView.product_name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="rounded-2xl bg-gray-100 flex items-center justify-center h-64">
                                        <span className="text-gray-400">No image available</span>
                                    </div>
                                )}

                                {/* Info */}
                                <div className="space-y-6">
                                    {/* Category & Name */}
                                    <div>
                                        <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold mb-3">
                                            {selectedProductForView.product_category}
                                        </span>
                                        <h3 className="text-2xl font-bold font-poppins text-gray-900 mb-4">
                                            {selectedProductForView.product_name || "Unnamed Product"}
                                        </h3>
                                        {selectedProductForView.product_description && (
                                            <p className="text-gray-600 leading-relaxed">
                                                {selectedProductForView.product_description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Price Info Card */}
                                    <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-200">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <DollarSign className="w-5 h-5" />
                                                    <span className="font-medium">Starting Price</span>
                                                </div>
                                                <span className="text-lg font-bold text-gray-900">
                                                    {formatCurrency(parseFloat(selectedProductForView.starting_price))}
                                                </span>
                                            </div>
                                            <div className="border-t border-primary-200 pt-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <TrendingUp className="w-5 h-5" />
                                                        <span className="font-medium">Current Highest Bid</span>
                                                    </div>
                                                    <span className="text-2xl font-bold text-primary-600">
                                                        {formatCurrency(parseFloat(selectedProductForView.current_highest_bid || selectedProductForView.starting_price))}
                                                    </span>
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Date & Time Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="card bg-gray-50">
                                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-sm font-medium">Bid Start</span>
                                            </div>
                                            <p className="text-sm text-gray-900 font-medium">
                                                {new Date(selectedProductForView.bid_start_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(selectedProductForView.bid_start_date).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="card bg-gray-50">
                                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-sm font-medium">Bid End</span>
                                            </div>
                                            <p className="text-sm text-gray-900 font-medium">
                                                {new Date(selectedProductForView.bid_end_date).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(selectedProductForView.bid_end_date).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Time Remaining (Active only) */}
                                    {selectedProductForView.status === "active" && (
                                        <div className="card bg-primary-50 border-2 border-primary-200">
                                            <div className="flex items-center gap-2 text-primary-700 mb-2">
                                                <Timer className="w-5 h-5" />
                                                <span className="font-semibold">Time Remaining</span>
                                            </div>
                                            <CountdownTimer endDate={selectedProductForView.bid_end_date} />
                                        </div>
                                    )}

                                    {/* Bid History Toggle */}
                                    <button
                                        onClick={() => setShowBidHistory(!showBidHistory)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {showBidHistory ? "Hide" : "View"} Bid History
                                    </button>

                                    {/* Bid History */}
                                    {showBidHistory && (
                                        <div className="card bg-gray-50">
                                            <h4 className="font-semibold font-poppins text-gray-900 mb-4">Recent Bids</h4>
                                            {bidHistory.length === 0 ? (
                                                <p className="text-gray-500 text-center py-4">No bids yet. Be the first to bid!</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {bidHistory.map((bid) => (
                                                        <div key={bid.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-600">{new Date(bid.created_at).toLocaleString()}</p>
                                                            </div>
                                                            <span className="text-lg font-bold text-primary-600">
                                                                {formatCurrency(parseFloat(bid.bid_amount))}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-4">
                            <button
                                onClick={closeProductDetail}
                                className="btn-secondary flex-1"
                            >
                                Close
                            </button>
                            {selectedProductForView.status === "active" && (
                                <button
                                    onClick={() => {
                                        closeProductDetail();
                                        handlePlaceBid(selectedProductForView);
                                    }}
                                    className="btn-primary flex-1"
                                >
                                    Place Bid
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AuctionCard = ({ auction, getSignedUrl, formatCurrency, onPlaceBid, onViewDetails }) => {
    const navigate = useNavigate();
    const [imageUrl, setImageUrl] = useState(null);
    const [imageLoading, setImageLoading] = useState(true);

    useEffect(() => {
        if (auction.product_image_url) {
            loadImage();
        } else {
            setImageLoading(false);
        }
    }, [auction.product_image_url]);

    const loadImage = async () => {
        try {
            const url = await getSignedUrl(auction.product_image_url);
            setImageUrl(url);
        } catch (error) {
            console.error('Error loading image:', error);
        } finally {
            setImageLoading(false);
        }
    };

    // Count bids for this auction
    const [bidCount, setBidCount] = useState(0);
    useEffect(() => {
        const loadBidCount = async () => {
            try {
                const { count } = await supabase
                    .from('bids')
                    .select('*', { count: 'exact', head: true })
                    .eq('bidding_product_id', auction.id);
                setBidCount(count || 0);
            } catch (error) {
                console.error('Error loading bid count:', error);
            }
        };
        loadBidCount();
    }, [auction.id]);

    return (
        <div className="card-hover overflow-hidden group">
            <div className="relative h-48 -mx-6 -mt-6 mb-4 overflow-hidden">
                {imageLoading ? (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt={auction.product_name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Gavel className="w-12 h-12 text-gray-400" />
                    </div>
                )}
                {auction.featured && (
                    <div className="absolute top-3 left-3 bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-medium">Featured</div>
                )}
                {auction.endsIn && (
                    <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {auction.endsIn}
                    </div>
                )}
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-3">{auction.product_name}</h3>

            <div className="flex justify-between items-center mb-4">
                <div>
                    <p className="text-xs text-gray-500">Current Bid</p>
                    <p className="text-xl font-bold text-primary-600">
                        {formatCurrency(Number(auction.current_highest_bid || auction.starting_price))}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Starting Price</p>
                    <p className="text-sm text-gray-600">{formatCurrency(Number(auction.starting_price))}</p>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">{bidCount} bids placed</span>
                <button
                    onClick={() => {
                        if (auction.status === 'active') {
                            onPlaceBid(auction);
                        } else {
                            // For upcoming auctions, show details
                            onViewDetails(auction);
                        }
                    }}
                    className="btn-primary !py-2 !px-4 flex items-center gap-1 text-sm"
                >
                    {auction.status === 'active' ? 'Place Bid' : 'View Details'} <Gavel className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// Countdown Timer Component
const CountdownTimer = ({ endDate }) => {
    const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });
    
    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date();
            const end = new Date(endDate);
            const diff = end - now;
            
            if (diff <= 0) {
                setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeRemaining({ days, hours, minutes, seconds, ended: false });
        };
        
        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);
        
        return () => clearInterval(interval);
    }, [endDate]);
    
    if (timeRemaining.ended) {
        return <div className="text-red-600 font-semibold">Bidding Ended</div>;
    }
    
    return (
        <div className="flex items-center gap-3">
            {timeRemaining.days > 0 && (
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary-600 font-poppins">{timeRemaining.days}</span>
                    <span className="text-xs text-gray-500 font-medium">Days</span>
                </div>
            )}
            <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary-600 font-poppins">{String(timeRemaining.hours).padStart(2, '0')}</span>
                <span className="text-xs text-gray-500 font-medium">Hours</span>
            </div>
            <span className="text-primary-600 font-bold">:</span>
            <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary-600 font-poppins">{String(timeRemaining.minutes).padStart(2, '0')}</span>
                <span className="text-xs text-gray-500 font-medium">Minutes</span>
            </div>
            <span className="text-primary-600 font-bold">:</span>
            <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-primary-600 font-poppins">{String(timeRemaining.seconds).padStart(2, '0')}</span>
                <span className="text-xs text-gray-500 font-medium">Seconds</span>
            </div>
        </div>
    );
};

export default BiddingGallery;

