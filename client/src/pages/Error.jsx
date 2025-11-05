import React from 'react'
import { Link } from 'react-router-dom'

const Error = () => {
  return (
    <div className='flex mt-50 text-bold text-5xl justify-center items-center'>
      <p>Page not 404</p>
      <Link to={`/`}>Click Here To Homepage</Link>
    </div>
  )
}

export default Error