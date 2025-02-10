# # Step 1: Build the React Vite app
# FROM node:18 AS build

# # Set working directory
# WORKDIR /app

# # Copy package.json and package-lock.json
# COPY package*.json ./

# # Install dependencies
# RUN npm install

# # Copy the rest of the app's source code
# COPY . .

# # Build the app
# RUN npm run build

# # Step 2: Set up Nginx to serve the app
# FROM nginx:alpine

# # Copy the build files from the previous stage
# COPY --from=build /app/dist /usr/share/nginx/html

# # Expose port 80
# EXPOSE 80

# # Start Nginx when the container runs
# CMD ["nginx", "-g", "daemon off;"]

# Use an official Node.js image as a base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Expose the port your app will run on
EXPOSE 8082

# Command to run the React app in production mode
CMD ["npm", "run","dev"]


