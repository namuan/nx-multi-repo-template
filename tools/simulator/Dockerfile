FROM golang:1.25.7-alpine AS builder
WORKDIR /app
COPY tools/simulator/main.go .
RUN go mod init simulator && go build -o simulator .

FROM alpine:3.20
COPY --from=builder /app/simulator /simulator
ENTRYPOINT ["/simulator"]
