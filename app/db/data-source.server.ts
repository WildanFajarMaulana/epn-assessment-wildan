import "dotenv/config";
import { DataSource } from "typeorm";
import {
    WorkShiftEntity,
    EmployeeEntity,
    DailyAttendanceEntity,
    UserEntity,
} from "./entities.server";
import { seedInitialData } from "./seed.server";


const globalForDb = globalThis as unknown as {
    __epnDataSource?: DataSource;
    __epnSeeded?: boolean;
}

function getDatabaseUrl() {
    return process.env.DATABASE_URL;
}

export async function getDataSource(): Promise<DataSource> {
    if(globalForDb.__epnDataSource?.isInitialized){
        return globalForDb.__epnDataSource
    }

    const dataSource = new DataSource({
        type: "postgres",
        url: getDatabaseUrl(),
        synchronize: true,
        logging: false,
        entities: [
            UserEntity,
            WorkShiftEntity,
            EmployeeEntity,
            DailyAttendanceEntity
        ]
    })

    await dataSource.initialize()
    globalForDb.__epnDataSource = dataSource

    if (!globalForDb.__epnSeeded) {
        await seedInitialData(dataSource);
        globalForDb.__epnSeeded = true;
    }

    return dataSource
}

export async function closeDataSource() {
    if (globalForDb.__epnDataSource?.isInitialized) {
        await globalForDb.__epnDataSource.destroy();
        globalForDb.__epnDataSource = undefined;
        globalForDb.__epnSeeded = false;
    }
}
