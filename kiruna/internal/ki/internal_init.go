package ki

import "path/filepath"

func (c *Config) Private_CommonInitOnce_OnlyCallInNewFunc() {
	c.commonInitOnce.Do(func() {
		c.validateConfig()

		c.initializedWithNew = true

		c.cleanSources = CleanSources{
			Dist:          filepath.Clean(c.DistDir),
			PrivateStatic: filepath.Clean(c.PrivateStaticDir),
			PublicStatic:  filepath.Clean(c.PublicStaticDir),
		}

		if c.CriticalCSSEntry != "" {
			c.cleanSources.CriticalCSSEntry = filepath.Clean(c.CriticalCSSEntry)
		}
		if c.NormalCSSEntry != "" {
			c.cleanSources.NormalCSSEntry = filepath.Clean(c.NormalCSSEntry)
		}

		c.__dist = toDistLayout(c.cleanSources.Dist)
	})
}
