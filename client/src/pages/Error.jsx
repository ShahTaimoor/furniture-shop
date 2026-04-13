import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '@/components/seo/SEO'

const Error = () => {
  return (
    <>
      <SEO
        title="Page Not Found"
        description="The page you’re looking for doesn’t exist. Head back to the FURNITURE homepage."
        keywords={['404', 'page not found', 'FURNITURE']}
        noIndex
      />
    <div className='flex mt-50 text-bold text-5xl justify-center items-center'>
      <p>Page not 404</p>
      <Link to={`/`}>Click Here To Homepage</Link>
    </div>
    </>
  )
}

export default Error