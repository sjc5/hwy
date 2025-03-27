package ki

import (
	"fmt"

	"golang.org/x/sync/errgroup"
)

const (
	OnChangeStrategyPre              = "pre"
	OnChangeStrategyPost             = "post"
	OnChangeStrategyConcurrent       = "concurrent"
	OnChangeStrategyConcurrentNoWait = "concurrent-no-wait"
)

type sortedOnChangeCallbacks struct {
	stratPre              []OnChange
	stratConcurrent       []OnChange
	stratPost             []OnChange
	stratConcurrentNoWait []OnChange
	exists                bool
}

func sortOnChangeCallbacks(onChanges []OnChange) sortedOnChangeCallbacks {
	stratPre := []OnChange{}
	stratConcurrent := []OnChange{}
	stratPost := []OnChange{}
	stratConcurrentNoWait := []OnChange{}
	exists := false
	if len(onChanges) == 0 {
		return sortedOnChangeCallbacks{}
	} else {
		exists = true
	}
	for _, o := range onChanges {
		switch o.Strategy {
		case OnChangeStrategyPre, "":
			stratPre = append(stratPre, o)
		case OnChangeStrategyConcurrent:
			stratConcurrent = append(stratConcurrent, o)
		case OnChangeStrategyPost:
			stratPost = append(stratPost, o)
		case OnChangeStrategyConcurrentNoWait:
			stratConcurrentNoWait = append(stratConcurrentNoWait, o)
		}
	}
	return sortedOnChangeCallbacks{
		stratPre:              stratPre,
		stratConcurrent:       stratConcurrent,
		stratPost:             stratPost,
		stratConcurrentNoWait: stratConcurrentNoWait,
		exists:                exists,
	}
}

func (c *Config) runConcurrentOnChangeCallbacks(onChanges *[]OnChange, evtName string, shouldWait bool) error {
	if len(*onChanges) > 0 {
		eg := errgroup.Group{}
		for _, o := range *onChanges {
			if c.getIsIgnored(evtName, &o.ExcludedPatterns) {
				continue
			}
			eg.Go(func() error {
				err := o.Func()
				if err != nil {
					c.Logger.Error(fmt.Sprintf("error running on-change callback: %v", err))
					return err
				}
				return nil
			})
		}

		if shouldWait {
			err := eg.Wait()
			if err != nil {
				return err
			}
		}

		// Kiruna has no control over error handling for "no-wait" callbacks
		// We simple call the function in a goroutine
		return nil
	}

	return nil
}

func (c *Config) simpleRunOnChangeCallbacks(onChanges *[]OnChange, evtName string) error {
	for _, o := range *onChanges {
		if c.getIsIgnored(evtName, &o.ExcludedPatterns) {
			continue
		}
		err := o.Func()
		if err != nil {
			c.Logger.Error(fmt.Sprintf("error running on-change callback: %v", err))
			return err
		}
	}
	return nil
}
