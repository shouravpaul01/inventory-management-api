import express from 'express'
import cors from 'cors'
import { globalErrorHandler } from './app/middlewares/globalErrorHandler'
import { UserRoutes } from './app/modules/user/user.route'
import { FacultyRoutes } from './app/modules/faculty/faculty.route'
import { CategoryRoutes } from './app/modules/category/category.route'
import { SubCatRoutes } from './app/modules/sub-category/subCategory.route'
import { AuthRoutes } from './app/modules/auth/auth.route'
import { AccessoryRouters } from './app/modules/accessories/accessories.route'
import { StockRoutes } from './app/modules/stock/stock.route'
import { OrderRoutes } from './app/modules/order/order.route'
const app = express()

app.use(express.json())
app.use(cors())

//Routes
app.use("/api/v1/users",UserRoutes)
app.use("/api/v1/faculties",FacultyRoutes)
app.use("/api/v1/auth",AuthRoutes)
app.use("/api/v1/categories",CategoryRoutes)
app.use("/api/v1/sub-categories",SubCatRoutes)
app.use("/api/v1/accessories",AccessoryRouters)
app.use("/api/v1/stocks",StockRoutes)
app.use("/api/v1/orders",OrderRoutes)
app.get('/', (req, res) => {
  res.send('Hello World!')
})

//Globally Error hanlde
app.use(globalErrorHandler)
export default app