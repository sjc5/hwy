package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"hwy-docs/internal/platform"
	"hwy-docs/internal/router"
)

func main() {
	// Create a new router and setup the API
	r := router.Init()

	// Init the server
	server := &http.Server{Addr: fmt.Sprintf(":%d", platform.GetEnv().Port), Handler: r}

	// Setup the server run context
	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	// Listen for syscall signals for process to exit
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGHUP, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
	go func() {
		<-sig

		// Shutdown the server with a grace period
		shutdownCtx, cancelCtx := context.WithTimeout(serverCtx, time.Duration(10)*time.Second)
		defer cancelCtx()

		go func() {
			<-shutdownCtx.Done()
			if shutdownCtx.Err() == context.DeadlineExceeded {
				log.Fatal("graceful shutdown timed out. forcing exit.\n")
			}
		}()

		// Trigger the server shutdown
		err := server.Shutdown(shutdownCtx)
		if err != nil {
			log.Fatal(err, "\n")
		}
		serverStopCtx()
	}()

	// Start the server
	fmt.Printf("starting server on: http://localhost:%d\n", platform.GetEnv().Port)
	err := server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		log.Fatal(err, "\n")
	}

	// Wait for the server to stop
	<-serverCtx.Done()
}
