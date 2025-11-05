import ProductList from '@/components/custom/ProductList'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import React from 'react'
import { useNavigate } from 'react-router-dom'
const Home = () => {
 

  return (
    <div>
      <ProductList />
    </div>
  )
}

export default Home