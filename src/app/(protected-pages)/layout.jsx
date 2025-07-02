import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'

const Layout = async ({ children }) => {
    return <PostLoginLayout>{children}</PostLoginLayout>
}

export default Layout
