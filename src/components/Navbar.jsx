import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Menu,
    X,
    Heart,
    ChevronDown,
    User,
    LogIn
} from 'lucide-react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const location = useLocation();

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'About Us', path: '/about' },
        { name: 'How It Works', path: '/how-it-works' },
        { name: 'Browse Donations', path: '/browse' },
        { name: 'Bidding', path: '/bidding-gallery' },
        { name: 'Contact', path: '/contact' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="bg-white/95 backdrop-blur-md shadow-soft sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-3 group">
                        <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-md ring-1 ring-primary-700/20 group-hover:shadow-lg transition-all duration-300">
                            <Heart className="w-6 h-6 text-white" fill="white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold font-poppins text-gray-900 leading-none">
                                Share<span className="text-primary-500">4</span>Good
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(link.path)
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden lg:flex items-center space-x-3">
                        <Link
                            to="/login"
                            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary-600 font-medium transition-colors duration-200"
                        >
                            <LogIn className="w-4 h-4" />
                            <span>Login</span>
                        </Link>
                        <Link
                            to="/signup"
                            className="btn-primary flex items-center space-x-2 !py-2.5 !px-5"
                        >
                            <User className="w-4 h-4" />
                            <span>Sign Up</span>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                className={`lg:hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
            >
                <div className="px-4 py-4 space-y-2 bg-white border-t border-gray-100">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsOpen(false)}
                            className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(link.path)
                                    ? 'bg-primary-50 text-primary-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="pt-4 space-y-2 border-t border-gray-100">
                        <Link
                            to="/login"
                            onClick={() => setIsOpen(false)}
                            className="block w-full text-center px-4 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Login
                        </Link>
                        <Link
                            to="/signup"
                            onClick={() => setIsOpen(false)}
                            className="block w-full text-center btn-primary !py-3"
                        >
                            Sign Up
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

