// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: __dirname + '/../.env' })

import { createApp } from './app'

const port = process.env.PORT || 4000
createApp().listen(port, () => console.log(`API listening on http://localhost:${port}`))
