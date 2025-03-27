package ki

import (
	"github.com/sjc5/river/kit/dirs"
)

const (
	PUBLIC  = "public"
	PRIVATE = "private"
)

type Dist struct {
	Bin    *dirs.Dir[DistBin]
	Kiruna *dirs.Dir[DistKiruna]
}

type DistBin struct {
	Main *dirs.File
}

type DistKiruna struct {
	Static   *dirs.Dir[DistKirunaStatic]
	Internal *dirs.Dir[DistKirunaInternal]
	X        *dirs.File
}

type DistKirunaStatic struct {
	Public  *dirs.Dir[DistKirunaStaticPublic]
	Private *dirs.DirEmpty
}

type DistKirunaStaticPublic struct {
	PublicInternal *dirs.DirEmpty
}

type DistKirunaInternal struct {
	CriticalDotCSS             *dirs.File
	NormalCSSFileRefDotTXT     *dirs.File
	PublicFileMapFileRefDotTXT *dirs.File
}

func toDistLayout(cleanDistDir string) *dirs.Dir[Dist] {
	x := dirs.Build(cleanDistDir, dirs.ToRoot(Dist{
		Bin: dirs.ToDir("bin", DistBin{
			Main: dirs.ToFile("main"),
		}),
		Kiruna: dirs.ToDir("kiruna", DistKiruna{
			Static: dirs.ToDir("static", DistKirunaStatic{
				Public: dirs.ToDir(PUBLIC, DistKirunaStaticPublic{
					PublicInternal: dirs.ToDirEmpty("kiruna_internal__"),
				}),
				Private: dirs.ToDirEmpty(PRIVATE),
			}),
			Internal: dirs.ToDir("internal", DistKirunaInternal{
				CriticalDotCSS:             dirs.ToFile("critical.css"),
				NormalCSSFileRefDotTXT:     dirs.ToFile("normal_css_file_ref.txt"),
				PublicFileMapFileRefDotTXT: dirs.ToFile("public_file_map_file_ref.txt"),
			}),
			X: dirs.ToFile("x"),
		}),
	}))

	return x
}
