import bcrypt from "bcryptjs";
import { getDataSource } from "~/db/data-source.server";
import { UserEntity } from "~/db/entities.server";
import type { SessionUser } from "~/lib/context";

export async function authenticateUser(
    email: string,
    password: string
): Promise<SessionUser | null> {
    const ds = await getDataSource();
    const userRepo = ds.getRepository(UserEntity);

    const user = await userRepo.findOne({
        where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
        return null;
    }

    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
        return null;
    }

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
}
