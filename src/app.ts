import express from 'express'
import cors from 'cors'
import { globalErrorHandler } from './app/middlewares/globalErrorHandler'
import { UserRoutes } from './app/modules/user/user.route'
import { FacultyRoutes } from './app/modules/faculty/faculty.route'
const app = express()

app.use(express.json())
app.use(cors())

//Routes
app.use("/api/v1/users",UserRoutes)
app.use("/api/v1/faculty-members",FacultyRoutes)
app.get('/', (req, res) => {
  res.send('Hello World!')
})

//Globally Error hanlde
app.use(globalErrorHandler)
export default app