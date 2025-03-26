import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from "@angular/core";
import { IonicModule } from "@ionic/angular";
import { NavigatorComponent } from "./navigator.component";
import { Router, RouterModule, RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";

@NgModule({
    imports: [
        CommonModule,
        IonicModule,
        RouterModule
    ],
    exports: [
        RouterModule
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class NavigatorModule {}
