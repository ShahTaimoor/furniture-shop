import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, Home } from 'lucide-react'

const Success = () => {
  const [countdown, setCountdown] = useState(5)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (countdown === 0) {
      navigate('/')
    }
  }, [countdown, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Order Successful!
        </h1>
        
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. Your order has been placed successfully.
        </p>

        {/* Countdown Timer */}
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            Redirecting to homepage in:
          </div>
          <div className="text-2xl font-bold text-green-600">
            {countdown} seconds
          </div>
        </div>

        {/* Manual Link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200"
        >
          <Home className="w-4 h-4" />
          Go to Homepage Now
        </Link>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Success