import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, Clock, MessageSquare, ArrowLeft } from 'lucide-react';

const Contact = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFeedback(null);

        try {
            // Try to use EmailJS if available
            const emailjs = await import('@emailjs/browser').catch(() => null);
            
            if (emailjs && process.env.REACT_APP_EMAILJS_SERVICE_ID) {
                if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
                    emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
                }

                await emailjs.send(
                    process.env.REACT_APP_EMAILJS_SERVICE_ID,
                    process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'template_contact',
                    {
                        from_name: formData.name,
                        from_email: formData.email,
                        subject: formData.subject,
                        message: formData.message,
                    }
                );

                setFeedback({ type: 'success', message: 'Message sent successfully! We will get back to you soon.' });
                setFormData({ name: '', email: '', subject: '', message: '' });
            } else {
                // If EmailJS not configured, just show success message
                setFeedback({ type: 'success', message: 'Thank you for your message! We will get back to you soon. For immediate assistance, please email us at info@share4good.org' });
                setFormData({ name: '', email: '', subject: '', message: '' });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setFeedback({ type: 'error', message: 'Failed to send message. Please email us directly at info@share4good.org' });
        } finally {
            setLoading(false);
        }
    };

    const contactInfo = [
        { icon: MapPin, title: 'Visit Us', info: '123 Charity Lane, Giving City, Pakistan 54000' },
        { icon: Phone, title: 'Call Us', info: '+92 300 123 4567' },
        { icon: Mail, title: 'Email Us', info: 'info@share4good.org' },
        { icon: Clock, title: 'Working Hours', info: 'Mon - Fri: 9AM - 6PM' },
    ];

    return (
        <div className="animate-fade-in">
            {/* Hero */}
            <section className="relative py-6 bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200 rounded-full blur-3xl opacity-20 -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-200 rounded-full blur-3xl opacity-20 -ml-32 -mb-32"></div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="flex items-start mb-4">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
                        </button>
                        
                        <div className="text-center max-w-3xl mx-auto flex-1">
                            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-xs font-semibold mb-3 shadow-sm">
                                <MessageSquare className="w-3 h-3" />
                                <span>Get In Touch</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-900 mb-2">Contact <span className="gradient-text">Us</span></h1>
                            <p className="text-sm text-gray-600">Have questions or want to get involved? We'd love to hear from you.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    {feedback && (
                        <div className={`mb-6 p-4 rounded-xl ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {feedback.message}
                        </div>
                    )}
                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* Contact Form */}
                        <div className="card">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 font-poppins">Send us a Message</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="label">Your Name</label>
                                        <input 
                                            type="text" 
                                            name="name" 
                                            value={formData.name} 
                                            onChange={handleChange} 
                                            className="input-field" 
                                            placeholder="John Doe" 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Email Address</label>
                                        <input 
                                            type="email" 
                                            name="email" 
                                            value={formData.email} 
                                            onChange={handleChange} 
                                            className="input-field" 
                                            placeholder="john@example.com" 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Subject</label>
                                    <input 
                                        type="text" 
                                        name="subject" 
                                        value={formData.subject} 
                                        onChange={handleChange} 
                                        className="input-field" 
                                        placeholder="How can we help?" 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="label">Message</label>
                                    <textarea 
                                        name="message" 
                                        value={formData.message} 
                                        onChange={handleChange} 
                                        rows="5" 
                                        className="input-field resize-none" 
                                        placeholder="Your message..." 
                                        required
                                    ></textarea>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" /> Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-6">
                            <div className="card bg-gradient-to-br from-primary-50 to-secondary-50">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 font-poppins">Contact Information</h2>
                                <div className="space-y-6">
                                    {contactInfo.map((item, i) => (
                                        <div key={i} className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <item.icon className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-800">{item.title}</h3>
                                                <p className="text-gray-600">{item.info}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Map Placeholder */}
                            <div className="card h-64 bg-gray-200 flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <MapPin className="w-12 h-12 mx-auto mb-2 text-primary-500" />
                                    <p className="font-medium">Map Location</p>
                                    <p className="text-sm">Interactive map will be displayed here</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
