import React from 'react'
import { X, Sparkles, Zap, Shield } from 'lucide-react'

const WhatsNewModal = ({ isOpen, onClose }) => {
 if (!isOpen) return null

 const features = [
 {
 icon: Sparkles,
 title: 'AI-Powered Search',
 description: 'Natural language understanding with AWS Bedrock for more accurate results',
 color: 'text-primary-500'
 },
 {
 icon: Zap,
 title: 'Instant Responses',
 description: 'Get answers in seconds from our comprehensive knowledge base',
 color: 'text-yellow-500'
 },
 {
 icon: Shield,
 title: 'Secure & Private',
 description: 'Enterprise-grade security with role-based access control',
 color: 'text-secondary-500'
 }
 ]

 return (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
 <div className="bg-dark-secondary border border-dark-tertiary rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-up shadow-2xl">
 <div className="flex items-center justify-between p-6 border-b border-dark-tertiary">
 <div className="flex items-center gap-3">
 <Sparkles className="w-6 h-6 text-primary-500" />
 <h2 className="text-xl font-semibold text-text-primary">What's New</h2>
 </div>
 <button
 onClick={onClose}
 className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
 >
 <X className="w-5 h-5 text-text-secondary" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-6">
 <div className="space-y-6">
 {features.map((feature, index) => (
 <div
 key={index}
 className="bg-dark-tertiary border border-dark-hover rounded-lg p-6 hover:border-primary-500 transition-all"
 >
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 bg-dark-hover rounded-lg flex items-center justify-center flex-shrink-0">
 <feature.icon className={'w-6 h-6 ' + feature.color} />
 </div>
 <div className="flex-1">
 <h3 className="text-lg font-semibold text-text-primary mb-2">
 {feature.title}
 </h3>
 <p className="text-text-secondary">
 {feature.description}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>

 <div className="mt-8 p-6 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 border border-primary-500/30 rounded-lg">
 <h3 className="text-lg font-semibold text-text-primary mb-2">
 More Coming Soon!
 </h3>
 <p className="text-text-secondary">
 We're constantly improving DocuMind. Stay tuned for more features and updates.
 </p>
 </div>
 </div>
 </div>
 </div>
 )
}

export default WhatsNewModal
