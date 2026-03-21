# Use a lightweight base image built on Alpine
FROM node:18-alpine

# Principle of least privilege: work inside /usr/src/app
WORKDIR /usr/src/app

# Copy dependency graphs over
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code securely
COPY . .

# Assume ownership properly to node unprivileged user
RUN chown -R node:node /usr/src/app

# Drop root privileges by switching to 'node' user
USER node

# Expose port
EXPOSE 3004

# Run app
CMD ["npm", "start"]
