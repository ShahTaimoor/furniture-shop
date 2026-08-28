import React, { useMemo, useState, useCallback, useEffect } from 'react'
import Navbar from '../custom/Navbar'
import BottomNavigation from '../custom/BottomNavigation'
import Footer from '../custom/Footer'
import { useIsMobile } from '../../hooks/use-mobile'
import { useLocation } from 'react-router-dom'
import { SearchProvider } from '../../contexts/SearchContext'
import { AuthDrawerProvider } from '../../contexts/AuthDrawerContext'
import { useSearch } from '../../hooks/use-search'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCart } from '../../redux/slices/cart/cartSlice'
import { fetchSettings } from '../../redux/slices/settings/settingsSlice'

const RootLayout = ({ children }) => {
    const isMobile = useIsMobile()
    const location = useLocation()
    const dispatch = useDispatch()
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [location.pathname, location.search])

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchCart())
        }
    }, [dispatch, isAuthenticated])

    useEffect(() => {
        dispatch(fetchSettings())
    }, [dispatch])

    const search = useSearch({
        initialCategory: 'all',
        initialPage: 1,
        initialLimit: 24,
        initialStockFilter: 'all',
        initialSortBy: 'az'
    })

    const [gridType, setGridType] = useState('grid2')
    const handleGridTypeChange = useCallback((type) => {
        setGridType(type)
    }, [])

    const searchContextValue = useMemo(() => ({
        search,
        gridType,
        handleGridTypeChange,
        searchTerm: search.searchTerm,
        handleSearchChange: search.handleSearchChange,
        handleSearchWithTracking: search.handleSearchWithTracking,
        searchHistory: search.searchHistory,
        popularSearches: search.popularSearches,
        allProducts: search.allProducts
    }), [search, gridType, handleGridTypeChange])

    const mainPaddingBottom = useMemo(() => {
        // Preserve additional bottom padding for mobile when bottom navigation is visible
        const pathsWithBottomNav = ['/cart', '/checkout', '/products', '/']
        return isMobile && pathsWithBottomNav.includes(location.pathname) ? 'pb-20' : ''
    }, [isMobile, location.pathname])

    return (
        <AuthDrawerProvider>
            <SearchProvider value={searchContextValue}>
                <Navbar />
                <main className={mainPaddingBottom}>
                    {children}
                </main>
                <Footer />
                <BottomNavigation />
            </SearchProvider>
        </AuthDrawerProvider>
    )
}

export default RootLayout