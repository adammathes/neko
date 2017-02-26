// vlog -- verbose logger -- wraps log functions and only performs them if "verbose"
package vlog

import (
	"fmt"
)

var VERBOSE bool

func init() {
	VERBOSE=false
}

func Printf(format string, v ...interface{}) {
	if VERBOSE {
		fmt.Printf(format, v...)
	}
}

func Println(v ...interface{}) {
	if VERBOSE {
		fmt.Println(v...)
	}
}
	
