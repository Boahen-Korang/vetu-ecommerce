import App from './App'
import Auth from './Auth'
import Shop from './Shop'
import Admin from './Admin'
import Cart from './CartPage'
import CheckoutSuccess from './CheckoutSuccess'
import { useRoute } from './router'

export default function Root() {
  const path = useRoute()
  if (path === '/login') return <Auth initial="login" />
  if (path === '/signup') return <Auth initial="signup" />
  if (path === '/shop') return <Shop />
  if (path === '/admin') return <Admin />
  if (path === '/cart') return <Cart />
  if (path === '/checkout/success') return <CheckoutSuccess />
  return <div className="landing-scope"><App /></div>
}
