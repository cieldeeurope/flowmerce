// schedule.service.ts
import {
  BeforeApplicationShutdown,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Schedule } from './schedule.entity';
import { UserService } from 'src/user/user.service';
import { User } from 'src/user/user.entity';
import { KakaotalkService } from 'src/kakaotalk/kakaotalk.service';


// 👉 각 브랜드 서비스 import
import { CrawlerService } from 'src/crawler/crawler.service';
import { FarfetchService } from 'src/farfetch/farfetch.service';
import { CettireService } from 'src/cettire/cettire.service';
import { PradaService } from 'src/prada/prada.service';
import { LvService } from 'src/lv/lv.service';
import { DiorService } from 'src/dior/dior.service';
import { BurberryService } from 'src/burberry/burberry.service';
import { CelineService } from 'src/celine/celine.service';
import { BalenciagaService } from 'src/balenciaga/balenciaga.service';
import { MiumiuService } from 'src/miumiu/miumiu.service';
import { BottegaService } from 'src/bottega/bottega.service';
import { FendiService } from 'src/fendi/fendi.service';
import { MaisonmargielaService } from 'src/maisonmargiela/maisonmargiela.service';
import { LoropianaService } from 'src/loropiana/loropiana.service';
import { LoeweService } from 'src/loewe/loewe.service';
import { StoneService } from 'src/stone/stone.service';
import { LemaireService } from 'src/lemaire/lemaire.service';
import { FerragamoService } from 'src/ferragamo/ferragamo.service';
import { DolceService } from 'src/dolce/dolce.service';
import { TherowService } from 'src/therow/therow.service';
import { MaxmaraService } from 'src/maxmara/maxmara.service';
import { MonclerService } from 'src/moncler/moncler.service';
import { AlexanderService } from 'src/alexander/alexander.service';
import { GivenchyService } from 'src/givenchy/givenchy.service';
import { SandroService } from 'src/sandro/sandro.service';
import { TodsService } from 'src/tods/tods.service';
import { ValentinoService } from 'src/valentino/valentino.service';
import { AcneService } from 'src/acne/acne.service';
import { BrunelloService } from 'src/brunello/brunello.service';
import { HernoService } from 'src/herno/herno.service';
import { ThombrowneService } from 'src/thombrowne/thombrowne.service';
import { TomfordService } from 'src/tomford/tomford.service';
import { HermesService } from 'src/hermes/hermes.service';
import { AmiService } from 'src/ami/ami.service';
import { JacquemusService } from 'src/jacquemus/jacquemus.service';
import { JilsanderService } from 'src/jilsander/jilsander.service';
import { OurlegacyService } from 'src/ourlegacy/ourlegacy.service';
import { PoleneService } from 'src/polene/polene.service';
import { RickowensService } from 'src/rickowens/rickowens.service';
import { ApcService } from 'src/apc/apc.service';
import { ChloeService } from 'src/chloe/chloe.service';
import { GucciService } from 'src/gucci/gucci.service';
import { IsabelmarantService } from 'src/isabelmarant/isabelmarant.service';
import { LongchampService } from 'src/longchamp/longchamp.service';
import { MaisonkitsuneService } from 'src/maisonkitsune/maisonkitsune.service';
import { MajeService } from 'src/maje/maje.service';
import { AlaiaService } from 'src/alaia/alaia.service';
import { CpcompanyService } from 'src/cpcompany/cpcompany.service';
import { DelvauxService } from 'src/delvaux/delvaux.service';
import { RogervivierService } from 'src/rogervivier/rogervivier.service';
import { TotemeService } from 'src/toteme/toteme.service';
import { JimmychooService } from 'src/jimmychoo/jimmychoo.service';
import { VersaceService } from 'src/versace/versace.service';
import { BerlutiService } from 'src/berluti/berluti.service';
import { OffwhiteService } from 'src/offwhite/offwhite.service';
import { EtroService } from 'src/etro/etro.service';



@Injectable()
export class ScheduleService implements OnModuleInit, BeforeApplicationShutdown {
    private serviceMap: Record<string, any>;
    private readonly runQueues = new Map<string, Promise<void>>();
    private readonly queuedScheduleIds = new Set<number>();
    // Track active execution by customer/platform so start notifications fire once per live run window.
    private readonly activeCollectionScopes = new Map<string, number>();

    constructor(
        @InjectRepository(Schedule)
        private readonly repo: Repository<Schedule>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,

        private readonly farfetchService: FarfetchService,
        private readonly cettireService: CettireService,
        private readonly crawlerService: CrawlerService,
        private readonly pradaService: PradaService,
        private readonly lvService: LvService,
        private readonly diorService: DiorService,
        private readonly burberryService: BurberryService,
        private readonly celineService: CelineService,
        private readonly balenciagaService: BalenciagaService,
        private readonly miumiuService: MiumiuService,
        private readonly bottegaService: BottegaService,
        private readonly fendiService: FendiService,
        private readonly maisonmargielaService: MaisonmargielaService,
        private readonly loropianaService: LoropianaService,
        private readonly loeweService: LoeweService,
        private readonly stoneService: StoneService,
        private readonly lemaireService: LemaireService,
        private readonly ferragamoService: FerragamoService,
        private readonly dolceService: DolceService,
        private readonly therowService: TherowService,
        private readonly maxmaraService: MaxmaraService,
        private readonly monclerService: MonclerService,
        private readonly alexanderService: AlexanderService,
        private readonly givenchyService: GivenchyService,
        private readonly sandroService: SandroService,
        private readonly todsService: TodsService,
        private readonly valentinoService: ValentinoService,
        private readonly acneService: AcneService,
        private readonly brunelloService: BrunelloService,
        private readonly hernoService: HernoService,
        private readonly thombrowneService: ThombrowneService,
        private readonly tomfordService: TomfordService,
        private readonly hermesService: HermesService,
        private readonly amiService: AmiService,
        private readonly jacquemusService: JacquemusService,
        private readonly jilsanderService: JilsanderService,
        private readonly ourlegacyService: OurlegacyService,
        private readonly poleneService: PoleneService,
        private readonly rickowensService: RickowensService,
        private readonly apcService: ApcService,
        private readonly chloeService: ChloeService,
        private readonly gucciService: GucciService,
        private readonly isabelmarantService: IsabelmarantService,
        private readonly longchampService: LongchampService,
        private readonly maisonkitsuneService: MaisonkitsuneService,
        private readonly majeService: MajeService,
        private readonly alaiaService: AlaiaService,
        private readonly cpcompanyService: CpcompanyService,
        private readonly delvauxService: DelvauxService,
        private readonly rogervivierService: RogervivierService,
        private readonly totemeService: TotemeService,
        private readonly jimmychooService: JimmychooService,
        private readonly versaceService: VersaceService,
        private readonly berlutiService: BerlutiService,
        private readonly offwhiteService: OffwhiteService,
        private readonly etroService: EtroService,

        private readonly userService: UserService,
        private readonly kakaotalkService: KakaotalkService,
    ) {

        // 🔥 서비스 맵
        this.serviceMap = {
          Farfetch: this.farfetchService,
          Cettire: this.cettireService,
          YSL: this.crawlerService,
          Prada: this.pradaService,
          Lv: this.lvService,
          Dior: this.diorService,
          Burberry: this.burberryService,
          Celine: this.celineService,
          Balenciaga: this.balenciagaService,
          Miumiu: this.miumiuService,
          Bottega: this.bottegaService,
          Fendi: this.fendiService,
          Loropiana: this.loropianaService,
          Maisonmargiela: this.maisonmargielaService,
          Loewe: this.loeweService,
          Stone: this.stoneService,
          Lemaire: this.lemaireService,
          Ferragamo: this.ferragamoService,
          Dolce: this.dolceService,
          Therow: this.therowService,
          Maxmara: this.maxmaraService,
          Moncler: this.monclerService,
          Alexander: this.alexanderService,
          Givenchy: this.givenchyService,
          Sandro: this.sandroService,
          Tods: this.todsService,
          Valentino: this.valentinoService,
          Acne: this.acneService,
          Brunello: this.brunelloService,
          Herno: this.hernoService,
          Thombrowne: this.thombrowneService,
          Tomford: this.tomfordService,
          Hermes: this.hermesService,
          Ami: this.amiService,
          Jacquemus: this.jacquemusService,
          Jilsander: this.jilsanderService,
          Ourlegacy: this.ourlegacyService,
          Polene: this.poleneService,
          Rickowens: this.rickowensService,
          Apc: this.apcService,
          Chloe: this.chloeService,
          Gucci: this.gucciService,
          Isabelmarant: this.isabelmarantService,
          Longchamp: this.longchampService,
          Maisonkitsune: this.maisonkitsuneService,
          Maje: this.majeService,
          Alaia: this.alaiaService,
          CPcompany: this.cpcompanyService,
          Delvaux: this.delvauxService,
          Rogervivier: this.rogervivierService,
          Toteme: this.totemeService,
          Jimmychoo: this.jimmychooService,
          Versace: this.versaceService,
          Berluti: this.berlutiService,
          Offwhite: this.offwhiteService,
          Etro: this.etroService,
        };
    }

  async onModuleInit() {
    await this.recoverSchedulesOnStartup();
  }

  async beforeApplicationShutdown() {
    await this.rollbackRunningSchedulesOnShutdown();
  }

  private formatRecoveryLog(row: Schedule, nextStatus: string, reason: string) {
    return [
      `[SCHEDULE-RECOVERY:${reason}]`,
      `id=${row.id}`,
      `customId=${row.customId}`,
      `accountPlatform=${row.accountPlatform}`,
      `site=${row.site}`,
      `category=${row.categoryName}`,
      `from=${row.status}`,
      `to=${nextStatus}`,
    ].join(' ');
  }

  private async recoverSchedulesOnStartup() {
    const targets = await this.repo.find({
      where: {
        status: In(['running', 'failed']),
      },
      order: {
        createdAt: 'ASC',
      },
    });

    if (!targets.length) {
      console.log('[SCHEDULE-RECOVERY:startup] no schedules to recover');
      return;
    }

    for (const row of targets) {
      console.log(this.formatRecoveryLog(row, 'pending', 'startup'));
      row.status = 'pending';
      row.errorMessage = null;
    }

    await this.repo.save(targets);

    const customIds = [...new Set(targets.map((row) => row.customId).filter(Boolean))];
    for (const customId of customIds) {
      await this.syncCollectionProgressSafely(customId, 'startup-recovery');
    }

    console.log(
      `[SCHEDULE-RECOVERY:startup] recovered=${targets.length} customIds=${customIds.join(',')}`,
    );
  }

  private async rollbackRunningSchedulesOnShutdown() {
    const targets = await this.repo.find({
      where: {
        status: 'running',
      },
      order: {
        createdAt: 'ASC',
      },
    });

    if (!targets.length) {
      console.log('[SCHEDULE-RECOVERY:shutdown] no running schedules to rollback');
      return;
    }

    for (const row of targets) {
      console.log(this.formatRecoveryLog(row, 'pending', 'shutdown'));
      row.status = 'pending';
      row.errorMessage = null;
    }

    await this.repo.save(targets);

    const customIds = [...new Set(targets.map((row) => row.customId).filter(Boolean))];
    for (const customId of customIds) {
      await this.syncCollectionProgressSafely(customId, 'shutdown-recovery');
    }

    console.log(
      `[SCHEDULE-RECOVERY:shutdown] rolledBack=${targets.length} customIds=${customIds.join(',')}`,
    );
  }

  private async syncCollectionProgressSafely(customId: string, reason: string) {
    try {
      await this.syncCollectionProgress(customId);
    } catch (error: any) {
      console.error(
        `[COLLECTION-PROGRESS:${reason}] customId=${customId} sync failed`,
        error?.message || error,
      );
    }
  }

  private async syncCollectionProgress(customId: string) {
    const user = await this.userRepository.findOne({
      where: { customId },
    });

    if (!user) {
      return;
    }

    const rows = await this.repo.find({
      where: { customId },
      order: {
        createdAt: 'ASC',
      },
    });

    if (rows.length === 0) {
      user.collectionStatus = 'not_requested';
      user.collectionCurrentCount = null;
      user.collectionTotalCount = null;
      user.collectionProgressPercent = null;
      user.collectionCurrentCategoryName = '';
      user.collectionStartedAt = null;
      user.collectionUpdatedAt = null;
      user.collectionFinishedAt = null;
      user.collectionMessage = '아직 수집 요청이 없습니다.';
      await this.userRepository.save(user);
      return;
    }

    const activeRows = rows.filter(
      (row) => row.status === 'pending' || row.status === 'running',
    );

    if (activeRows.length > 0) {
      let batchStartAt = activeRows[0].createdAt;

      for (const row of activeRows) {
        if (row.createdAt < batchStartAt) {
          batchStartAt = row.createdAt;
        }
      }

      const batchRows = rows.filter((row) => row.createdAt >= batchStartAt);
      const runningRows = batchRows.filter((row) => row.status === 'running');
      const pendingRows = batchRows.filter((row) => row.status === 'pending');
      const doneRows = batchRows.filter((row) => row.status === 'done');
      const totalCount = batchRows.length;
      const currentCount =
        doneRows.length + (runningRows.length > 0 ? runningRows.length : 0);
      const progressPercent =
        totalCount > 0
          ? Math.max(
              0,
              Math.min(100, Math.round((currentCount / totalCount) * 100)),
            )
          : null;

      user.collectionStatus = runningRows.length > 0 ? 'running' : 'pending';
      user.collectionCurrentCount = currentCount;
      user.collectionTotalCount = totalCount;
      user.collectionProgressPercent = progressPercent;
      user.collectionCurrentCategoryName =
        runningRows[0]?.categoryName || pendingRows[0]?.categoryName || '';
      user.collectionStartedAt = batchStartAt;
      user.collectionUpdatedAt = new Date();
      user.collectionFinishedAt = null;
      user.collectionMessage =
        runningRows.length > 0
          ? `${currentCount}/${totalCount} 카테고리 진행 중`
          : `${pendingRows.length}개 카테고리 대기 중`;
      await this.userRepository.save(user);
      return;
    }

    const batchStartAt =
      user.collectionStartedAt || rows[rows.length - 1].createdAt;
    const batchRows = rows.filter((row) => row.createdAt >= batchStartAt);
    const doneRows = batchRows.filter((row) => row.status === 'done');
    const failedRows = batchRows.filter((row) => row.status === 'failed');
    const totalCount = batchRows.length;

    if (failedRows.length > 0 && doneRows.length === 0) {
      user.collectionStatus = 'failed';
      user.collectionCurrentCount = 0;
      user.collectionTotalCount = totalCount || failedRows.length;
      user.collectionProgressPercent = 0;
      user.collectionCurrentCategoryName = failedRows[0]?.categoryName || '';
      user.collectionUpdatedAt = new Date();
      user.collectionFinishedAt = new Date();
      user.collectionMessage = '수집 중 오류가 발생했습니다.';
      await this.userRepository.save(user);
      return;
    }

    if (doneRows.length > 0) {
      user.collectionStatus = 'completed';
      user.collectionCurrentCount = totalCount;
      user.collectionTotalCount = totalCount;
      user.collectionProgressPercent = 100;
      user.collectionCurrentCategoryName = '';
      user.collectionUpdatedAt = new Date();
      user.collectionFinishedAt = new Date();
      user.collectionMessage = '최근 수집 요청이 완료되었습니다.';
      await this.userRepository.save(user);
      return;
    }

    user.collectionStatus = 'not_requested';
    user.collectionCurrentCount = null;
    user.collectionTotalCount = null;
    user.collectionProgressPercent = null;
    user.collectionCurrentCategoryName = '';
    user.collectionUpdatedAt = null;
    user.collectionFinishedAt = null;
    user.collectionMessage = '아직 수집 요청이 없습니다.';
    await this.userRepository.save(user);
  }

  private async notifyCollectionCompleted(job: Schedule) {
    const notificationPhone =
      await this.userService.getNotificationPhoneByCustomId(job.customId);

    if (!notificationPhone) {
      return;
    }

    const remainingCount = await this.repo.count({
      where: {
        customId: job.customId,
        accountPlatform: job.accountPlatform,
        status: In(['pending', 'running', 'failed']),
      },
    });

    const doneCount = await this.repo.count({
      where: {
        customId: job.customId,
        accountPlatform: job.accountPlatform,
        status: 'done',
      },
    });

    if (remainingCount > 0 || doneCount === 0) {
      return;
    }

    await this.kakaotalkService.sendCollectionCompleted({
      to: notificationPhone,
      accountPlatform: job.accountPlatform,
    });
  }


  // 🔥 수집예약 (DB 저장)
  async create(body: any) {
    const {
      site,
      siteUrls,
      godoMallCategoryCode,
      godoMallCategoryName,
      categoryName,
      partnerKey,
      apiKey,
      customId,
      accountPlatform,
    } = body;

    // 🔥 중복 체크 (핵심)
    const existing = await this.repo.findOne({
      where: {
        site,
        siteUrls,
        customId,
        categoryName,
        accountPlatform,
        status: In(['pending', 'running']), // 🔥 진행중인 것만 막기
      },
    });

    if (existing) {
      return {
        message: '이미 예약된 작업입니다.',
        duplicated: true,
      };
    }

    const job = this.repo.create({
      site,
      siteUrls,
      godoMallCategoryCode,
      godoMallCategoryName,
      categoryName,
      partnerKey,
      apiKey,
      customId,
      accountPlatform,
      status: 'pending',
    });

    await this.repo.save(job);
    await this.syncCollectionProgress(customId);

    return {
      message: '수집 예약 완료',
      id: job.id,
    };
  }

  async notifyCollectionStartedManually(
    customId: string,
    accountPlatform: string,
  ) {
    const normalizedCustomId = String(customId || '').trim();
    const normalizedAccountPlatform = String(accountPlatform || '').trim();

    if (!normalizedCustomId || !normalizedAccountPlatform) {
      return {
        message: 'customId와 accountPlatform이 필요합니다.',
        sent: false,
      };
    }

    const notificationPhone =
      await this.userService.getNotificationPhoneByCustomId(normalizedCustomId);

    if (!notificationPhone) {
      return {
        message: '알림톡 수신 전화번호가 없습니다.',
        sent: false,
        skipped: true,
      };
    }

    const result = await this.kakaotalkService.sendCollectionStarted({
      to: notificationPhone,
      accountPlatform: normalizedAccountPlatform,
    });

    if (result?.success) {
      return {
        message: '수집 시작 알림톡을 발송했습니다.',
        sent: true,
      };
    }

    return {
      message: '수집 시작 알림톡 발송이 건너뛰었거나 실패했습니다.',
      sent: false,
      result,
    };
  }

  // 🔥 pending & failed 조회
  async find(
    customId: string,
    accountPlatform: string,
    status?: string,
    site?: string,
  ) {
    const statuses = this.getStatusFilter(status);
    const normalizedSite = String(site || '').trim();

    const where: any = {
      customId,
      accountPlatform,
      status: In(statuses),
    };

    if (normalizedSite) {
      where.site = normalizedSite;
    }

    return await this.repo.find({
      where,
      order: {
        createdAt: 'ASC',
      },
    });
  }

  private buildRunQueueKey(job: Schedule, runGroup?: string) {
    const normalizedRunGroup = runGroup?.trim();

    if (normalizedRunGroup) {
      return `batch:${normalizedRunGroup}`;
    }

    return `${job.customId}::${job.accountPlatform}`;
  }

  private buildCollectionScopeKey(job: Schedule) {
    return `${job.customId}::${job.accountPlatform}`;
  }

  private beginCollectionScope(job: Schedule) {
    const scopeKey = this.buildCollectionScopeKey(job);
    const activeCount = this.activeCollectionScopes.get(scopeKey) ?? 0;

    this.activeCollectionScopes.set(scopeKey, activeCount + 1);

    return activeCount === 0;
  }

  private finishCollectionScope(job: Schedule) {
    const scopeKey = this.buildCollectionScopeKey(job);
    const activeCount = this.activeCollectionScopes.get(scopeKey) ?? 0;

    if (activeCount <= 1) {
      this.activeCollectionScopes.delete(scopeKey);
      return true;
    }

    this.activeCollectionScopes.set(scopeKey, activeCount - 1);
    return false;
  }

  private enqueueRun(
    job: Schedule,
    index?: number,
    total?: number,
    runGroup?: string,
  ) {
    if (this.queuedScheduleIds.has(job.id)) {
      return;
    }

    const queueKey = this.buildRunQueueKey(job, runGroup);
    const isNewQueue = !this.runQueues.has(queueKey);

    if (isNewQueue) {
      this.beginCollectionScope(job);
    }

    this.queuedScheduleIds.add(job.id);

    const previousQueue = this.runQueues.get(queueKey) ?? Promise.resolve();

    const currentQueue = previousQueue
      .catch(() => {})
      .then(async () => {
        await this.executeRun(job.id, index, total);
      })
      .catch(() => {})
      .finally(async () => {
        this.queuedScheduleIds.delete(job.id);

        if (this.runQueues.get(queueKey) === currentQueue) {
          this.runQueues.delete(queueKey);
          const shouldNotifyCollectionComplete = isNewQueue
            ? this.finishCollectionScope(job)
            : false;

          if (shouldNotifyCollectionComplete) {
            await this.notifyCollectionCompleted(job);
          }
        }
      });

    this.runQueues.set(queueKey, currentQueue);
  }

  // 🔥 실행
  async run(id: number, index?: number, total?: number, runGroup?: string) {
    const job = await this.repo.findOne({ where: { id } });

    if (!job) {
      return { message: '작업 없음' };
    }

    const service = this.serviceMap[job.site];

    if (!service) {
      return {
        message: `지원하지 않는 사이트: ${job.site}`,
        accepted: false,
        scheduleId: job.id,
      };
    }

    if (job.status === 'done') {
      return {
        message: '이미 완료된 예약입니다.',
        accepted: false,
        scheduleId: job.id,
      };
    }

    if (job.status === 'running' || this.queuedScheduleIds.has(job.id)) {
      return {
        message: '이미 실행 중이거나 대기 중인 예약입니다.',
        accepted: true,
        scheduleId: job.id,
      };
    }

    if (job.status === 'failed') {
      job.status = 'pending';
      job.errorMessage = null;
      await this.repo.save(job);
      await this.syncCollectionProgressSafely(job.customId, `requeue:${job.id}`);
    }

    this.enqueueRun(job, index, total, runGroup);

    return {
      message: '실행 요청이 접수되었습니다.',
      accepted: true,
      scheduleId: job.id,
      runGroup,
    };
  }

  private async executeRun(id: number, index?: number, total?: number) {
    const job = await this.repo.findOne({ where: { id } });

    console.log(
      `🚀 [${index}/${total}] 시작 - scheduleId=${id} customId=${job.customId || ""} site=${job.site || ""}`,
    );

    if (!job) {
      return { message: '작업 없음' };
    }

    try {
      await this.userService.assertRequestAvailable(job.customId, 1);
    } catch (error: any) {
      job.status = 'failed';
      job.errorMessage = error?.message || '요청 수 소진';
      await this.repo.save(job);
      throw error;
    }

    const service = this.serviceMap[job.site];

    if (!service) {
      return { message: `지원하지 않는 사이트: ${job.site}` };
    }

    job.status = 'running';
    await this.repo.save(job);
    await this.syncCollectionProgressSafely(job.customId, `run-start:${job.id}`);

    try {
      let success = false;

      for (let retry = 0; retry < 3; retry++) {
        try {

          if (retry > 0) {
            console.log(`🔄 재시도 ${retry}/2`); // retry=1 → 1/2
          }

          await service.getProductsFromCategory(
            job.siteUrls,
            job.partnerKey,
            job.apiKey,
            job.customId,
            job.accountPlatform,
            job.godoMallCategoryCode,
          );

          success = true;
          break;

        } catch (err) {
          console.error(`❌ 실패 (retry ${retry + 1})`, err);
          if (retry === 2) throw err;
        }
      }

      if (!success) {
        throw new Error('크롤링 실패');
      }

      job.status = 'done';

    } catch (err: any) {
      job.status = 'failed';
      job.errorMessage = err?.stack || err?.message || String(err);

      console.error(`💥 [FAILED] scheduleId=${id}`, err);
    }

    await this.repo.save(job);
    await this.syncCollectionProgressSafely(job.customId, `run-end:${job.id}`);
    if (job.status === 'done') {
      console.log(
        `✅ 완료 [DONE] - scheduleId=${id} customId=${job.customId || ""} site=${job.site || ""}`,
      );
    }
    return { message: '실행 완료' };
  }

  private getStatusFilter(status?: string) {
    if (status === 'done') {
      return ['done'];
    }

    return ['pending', 'running', 'failed'];
  }

  // 🔥 예약이 걸려있는 customId 목록
  async getScheduledCustomIds(status?: string) {
    const statuses = this.getStatusFilter(status);

    const rows = await this.repo
      .createQueryBuilder('schedule')
      .select('DISTINCT schedule.customId', 'customId')
      .where('schedule.status IN (:...statuses)', { statuses })
      .andWhere('schedule.customId IS NOT NULL')
      .andWhere("schedule.customId != ''")
      .orderBy('schedule.customId', 'ASC')
      .getRawMany();

    return rows
      .map((row) => row.customId)
      .filter(Boolean);
  }

  // 🔥 특정 customId 에 걸려있는 accountPlatform 목록
  async getScheduledAccountPlatforms(customId: string, status?: string) {
    const statuses = this.getStatusFilter(status);

    const rows = await this.repo
      .createQueryBuilder('schedule')
      .select('DISTINCT schedule.accountPlatform', 'accountPlatform')
      .where('schedule.customId = :customId', { customId })
      .andWhere('schedule.status IN (:...statuses)', { statuses })
      .andWhere('schedule.accountPlatform IS NOT NULL')
      .andWhere("schedule.accountPlatform != ''")
      .orderBy('schedule.accountPlatform', 'ASC')
      .getRawMany();

    return rows
      .map((row) => row.accountPlatform)
      .filter(Boolean);
  }

  async getScheduledSites(
    customId: string,
    accountPlatform: string,
    status?: string,
  ) {
    const statuses = this.getStatusFilter(status);

    const rows = await this.repo
      .createQueryBuilder('schedule')
      .select('DISTINCT schedule.site', 'site')
      .where('schedule.customId = :customId', { customId })
      .andWhere('schedule.accountPlatform = :accountPlatform', {
        accountPlatform,
      })
      .andWhere('schedule.status IN (:...statuses)', { statuses })
      .andWhere('schedule.site IS NOT NULL')
      .andWhere("schedule.site != ''")
      .orderBy('schedule.site', 'ASC')
      .getRawMany();

    return rows.map((row) => row.site).filter(Boolean);
  }

  // 🔥 예약 삭제
  async deleteSchedules(ids: number[]) {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: '삭제할 예약이 없습니다.',
      };
    }

    const rows = await this.repo.find({
      where: {
        id: In(ids),
      },
    });

    if (!rows.length) {
      return {
        success: false,
        message: '삭제할 예약을 찾을 수 없습니다.',
      };
    }

    await this.repo.remove(rows);
    const affectedCustomIds = [...new Set(rows.map((row) => row.customId).filter(Boolean))];

    for (const customId of affectedCustomIds) {
      await this.syncCollectionProgress(customId);
    }

    return {
      success: true,
      message: '선택한 예약을 삭제했습니다.',
      count: rows.length,
    };
  }

  async deleteSchedulesForUser(customId: string, ids: number[]) {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        message: '삭제할 예약이 없습니다.',
      };
    }

    const rows = await this.repo.find({
      where: {
        id: In(ids),
        customId,
      },
    });

    if (!rows.length) {
      return {
        success: false,
        message: '삭제할 예약을 찾을 수 없습니다.',
      };
    }

    await this.repo.remove(rows);
    await this.syncCollectionProgress(customId);

    return {
      success: true,
      message: '선택한 예약을 삭제했습니다.',
      count: rows.length,
    };
  }
}
