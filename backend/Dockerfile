# Multi-stage build for FinFlow Go Backend
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git and certificates
RUN apk add --no-cache git ca-certificates tzdata

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/finflow-api ./cmd/api

# Minimal production runtime
FROM alpine:3.21

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/finflow-api /app/finflow-api

# Expose port (Render sets $PORT dynamically, Fiber defaults to 8080 or $PORT)
EXPOSE 8080

CMD ["/app/finflow-api"]
