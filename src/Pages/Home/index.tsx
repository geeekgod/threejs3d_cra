import React from 'react'
import { Link } from 'react-router-dom'

// Assets
import reactLogo from '../../assets/react.svg'
import './index.scss'

const Home = () => {

  return (
    <div className="App">
      <div>
        <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h1 className='title'>Shoe detector using React & Mediapipe</h1>
      <div className="card">
        <Link to="/shoes">
          <button>Check it out</button>
        </Link>
      </div>
    </div>
  )
}

export default Home
