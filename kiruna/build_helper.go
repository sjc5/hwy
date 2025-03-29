package kiruna

import (
	"flag"
	"fmt"

	"github.com/sjc5/river/kit/executil"
	"github.com/sjc5/river/kit/fsutil"
	"github.com/sjc5/river/kit/tsgen"
)

type BuildHelper struct {
	Kiruna        *Kiruna    // REQUIRED
	DevConfig     *DevConfig // REQUIRED
	FilesToVendor [][2]string
	GenHook       func() error
	BuildHook     func(isDev bool, isInit bool) error
}

func (inst *BuildHelper) Dev(isInit bool) {
	SetModeToDev()
	inst.mustCommonBuild(true, isInit)
	if isInit {
		inst.Kiruna.MustStartDev(inst.DevConfig)
	}
}

func (inst *BuildHelper) ProdBuild(isInit bool) {
	inst.mustCommonBuild(false, isInit)

	if err := inst.Kiruna.Build(); err != nil {
		panic(fmt.Errorf("kiruna: buildhelper: ProdBuild: %w", err))
	}
}

func (inst *BuildHelper) ProdBuildNonGo(isInit bool) {
	inst.mustCommonBuild(false, isInit)

	if err := inst.Kiruna.BuildWithoutCompilingGo(); err != nil {
		panic(fmt.Errorf("kiruna: buildhelper: ProdBuildNonGo: %w", err))
	}
}

func (inst *BuildHelper) Gen(isDev bool) {
	if isDev {
		SetModeToDev()
	}
	if inst.GenHook == nil {
		panic("kiruna: buildhelper: GenHook is nil")
	}
	if err := inst.GenHook(); err != nil {
		panic(fmt.Errorf("kiruna: buildhelper: Gen: %w", err))
	}
}

func (inst *BuildHelper) mustCommonBuild(isDev bool, isInit bool) {
	if err := vendorFiles(inst.FilesToVendor); err != nil {
		panic(fmt.Errorf("kiruna: buildhelper: mustCommonBuild: %w", err))
	}

	if inst.GenHook != nil {
		// Must run once at beginning so that it exists when the ts gen step happens.
		// This is because the gen step relies on the base Kiruna build output in order
		// to call GetPublicFileMapKeysBuildtime().
		if err := inst.Kiruna.BuildWithoutCompilingGo(); err != nil {
			panic(fmt.Errorf("kiruna: buildhelper: mustCommonBuild: %w", err))
		}

		inst.Gen(isDev)
	}

	if inst.BuildHook != nil {
		if err := inst.BuildHook(isDev, isInit); err != nil {
			panic(fmt.Errorf("kiruna: buildhelper: mustCommonBuild: %w", err))
		}
	}
}

// These should be used when you need to run tasks from
// inside an OnChangeCallback in your Kiruna.DevConfig. Why
// is this pattern necessary? Because the dev server is
// instantiated only once, not every time you save a .go file.
// So, in order for inputs to actually be re-evaluated, we need
// to run these as fresh scripts according to the trigger in
// your kiruna.DevConfig.
func (k Kiruna) DevOnChange() error {
	return executil.MakeCmdRunner("go", "run", k.c.TasksPath, "-dev", "-onchange")()
}
func (k Kiruna) ProdBuildOnChange() error {
	return executil.MakeCmdRunner("go", "run", k.c.TasksPath, "-gen", "-onchange")()
}
func (k Kiruna) ProdBuildNonGoOnChange() error {
	return executil.MakeCmdRunner("go", "run", k.c.TasksPath, "-prod-build-non-go", "-onchange")()
}
func (k Kiruna) GenOnChange() error {
	return executil.MakeCmdRunner("go", "run", k.c.TasksPath, "-gen", "-onchange")()
}

const (
	flagDev            = "dev"
	flagProdBuild      = "prod-build"
	flagProdBuildNonGo = "prod-build-non-go"
	flagGen            = "gen"
	onChange           = "onchange"
)

func (inst *BuildHelper) Tasks() {
	devFlag := flag.Bool(flagDev, false, "Run Dev() function")
	buildFlag := flag.Bool(flagProdBuild, false, "Run ProdBuild() function")
	buildWithoutGoFlag := flag.Bool(flagProdBuildNonGo, false, "Run ProdBuildNonGo() function")
	genFlag := flag.Bool(flagGen, false, "Run Gen() function")
	onChangeFlag := flag.Bool(onChange, false, "Signify that this is an onchange task")

	flag.Parse()

	// Count how many flags are set to true
	flagCount := 0
	if *devFlag {
		flagCount++
	}
	if *buildFlag {
		flagCount++
	}
	if *buildWithoutGoFlag {
		flagCount++
	}
	if *genFlag {
		flagCount++
	}

	// Panic if no flags or multiple flags are set
	if flagCount != 1 {
		panic(fmt.Sprintf(
			"kiruna: buildhelper: Tasks: Must specify exactly one of the following flags: -%s, -%s, -%s, -%s",
			flagDev, flagProdBuild, flagProdBuildNonGo, flagGen,
		))
	}

	var isOnChange bool
	if onChangeFlag != nil && *onChangeFlag {
		isOnChange = true
	}

	// Run the appropriate function based on the flag
	switch {
	case *devFlag:
		inst.Dev(!isOnChange)
	case *buildFlag:
		inst.ProdBuild(!isOnChange)
	case *buildWithoutGoFlag:
		inst.ProdBuildNonGo(!isOnChange)
	case *genFlag:
		inst.Gen(false)
	}
}

// If you pass nil to this function, it will return a pointer to a new Statements
// object. If you pass a pointer to an existing Statements object, it will mutate
// that object and return it.
func (k Kiruna) AddPublicAssetKeys(statements *tsgen.Statements) *tsgen.Statements {
	a := statements
	if a == nil {
		a = &tsgen.Statements{}
	}

	keys, err := k.GetPublicFileMapKeysBuildtime()
	if err != nil {
		panic(err)
	}

	a.Serialize("const KIRUNA_PUBLIC_ASSETS", keys)
	a.Raw("export type KirunaPublicAsset", "`${\"/\" | \"\"}${(typeof KIRUNA_PUBLIC_ASSETS)[number]}`")

	return a
}

// vendorFiles takes a slice of src-dest tuples
func vendorFiles(filesToVendor [][2]string) error {
	for _, c := range filesToVendor {
		if err := fsutil.CopyFile(c[0], c[1]); err != nil {
			return err
		}
	}

	return nil
}
