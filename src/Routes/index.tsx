import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from '../Pages/Home';
import ShoesContainer from '../Pages/Shoes';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: "/shoes",
    element: <ShoesContainer />
  }
]);

const Routes = () => {
  return (
    <RouterProvider router={router} />
  )
}

export default Routes
