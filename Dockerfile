FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
