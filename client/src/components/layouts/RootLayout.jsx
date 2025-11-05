import React from 'react'
import Navbar from '../custom/Navbar'
import BottomNavigation from '../custom/BottomNavigation'
import Footer from '../custom/Footer'
import { useIsMobile } from '../../hooks/use-mobile'
import { useLocation } from 'react-router-dom'

const RootLayout = ({ children }) => {
    const isMobile = useIsMobile()
    const location = useLocation()
    
    // Hide navigation on login/signup pages
    const hideNavigation = location.pathname === '/login' || location.pathname === '/signup'
    
    return (
        <>
            {!hideNavigation && <Navbar />}
            <main className={isMobile && !hideNavigation ? 'pb-20' : ''}>
                {children}
            </main>
            {!hideNavigation && <Footer />}
            {!hideNavigation && <BottomNavigation />}
        </>
    )
}

export default RootLayout