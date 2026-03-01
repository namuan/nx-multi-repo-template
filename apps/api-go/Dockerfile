FROM golang:1.23-alpine AS builder
WORKDIR /app

# Copy go workspace files
COPY go.work go.work.sum* ./
COPY apps/api-go/ ./apps/api-go/

WORKDIR /app/apps/api-go
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /api-go .

FROM alpine:3
RUN apk add --no-cache wget ca-certificates
COPY --from=builder /api-go /api-go
EXPOSE 8080
CMD ["/api-go"]
