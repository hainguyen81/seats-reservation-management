# Public Seat Reservation Platform

## Project Source Code Structure
├── prisma/
│   └── schema.prisma					# SQLite schema
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/route.ts		# API Login (90 days)
│   │   │   ├── seats/route.ts        	# API to get the seats list
│   │   │   └── reserve/route.ts      	# API to reserve seat and payment (Transaction)
│   │   │   └── release/route.ts      	# API to release seat if expired/cancelled
│   │   ├── layout.tsx
│   │   └── page.tsx                  	# Main UI (Dashboard)
│   └── lib/
│       ├── db.ts           			# Initial Prisma Client
│       └── auth.ts         			# Hash/Encode JWT
├── .env
├── README.md
└── package.json
