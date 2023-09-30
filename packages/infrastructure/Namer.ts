import { Construct } from "constructs";
import * as random from "@cdktf/provider-random";

const PREFIX = "stablio";

export class Namer {
    private readonly pet: random.pet.Pet;
    constructor(private readonly scope: Construct, private readonly construct: string) { 
        this.pet = new random.pet.Pet(this.scope, "namer-pet", {
            length: 2
        });
    }

    public name(resource: string): string {
        return `${PREFIX}-${this.construct}-${resource}-${this.pet.id}`;
    }
}